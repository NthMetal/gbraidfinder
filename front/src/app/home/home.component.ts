import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DragulaService } from 'ng2-dragula';
import { MetadataService } from '../shared/services/metadata.service';
import { SocketioService } from '../shared/services/socketio.service';

import { NgForm } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { NotificationService } from '../shared/services/notification.service';
import { SettingsService } from '../shared/services/settings.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild(MatSort) set matSort(ms: MatSort) {
    this.sort = ms;
    this.standardRaids.sort = this.sort;
    this.impossibleRaids.sort = this.sort;
  }
  @ViewChild('settingsForm') settingsForm: NgForm;
  @ViewChild('battleKeyInput') battleKeyInput: ElementRef<HTMLTextAreaElement>;

  raid_metadata: any[] = [];
  subscribedRaids: any[] = [];

  raids: { [quest_id: string]: any[] } = {};

  formChangesSubscription: Subscription;

  lastStatusRecievedAt: Date;
  status: {
    raidStatus: {
      tweetStatus: {
        lastTweetRecievedAt?: Date,
        lastTweetSourceRecievedAt?: Date
      },
      gbrStatus: (Date | null)[]
    },
    socketStatus: { active: boolean, usersConnected: number }
  }

  raidSearch = '';
  raidSearchSubject = new Subject<string>();
  raidSearchFiltered: { standard: { [key: string]: any[] }, impossible: { [key: string]: any[] } };

  elements: string[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'normal']
  joinLevels: number[] = []
  groupedRaids: { standard: { [key: string]: any[] }, impossible: { [key: string]: any[] } };
  standardDifficulties: string[] = [];
  impossibleDifficulties: string[] = [];

  sort: MatSort;
  standardRaids: MatTableDataSource<any> = new MatTableDataSource([] as any[]);
  impossibleRaids: MatTableDataSource<any> = new MatTableDataSource([] as any[]);

  tableViewHeaders = ['name', 'element', 'difficulty'];

  tabActive = true;
  tabFocused = true;

  public readonly bitcoinAddressToDisplay = 'bc1qcrpyd6z5q7z3735y26psl2auc6jr97kjnurxsg';

  constructor(
    private router: Router,
    public socketioService: SocketioService,
    private dialog: MatDialog,
    private bottomSheet: MatBottomSheet,
    private metadataService: MetadataService,
    private snackBar: MatSnackBar,
    private dragulaService: DragulaService,
    private notificationService: NotificationService,
    public settingsService: SettingsService
  ) { }

  /**
   * ng init, runs once on page load
   * see method for specific initializations
   */
  async ngOnInit(): Promise<void> {
    /**
     * Adds listener for when the user tabs out
     * Used to limit raids that appear when tabbed out
     */
    document.addEventListener("visibilitychange", (event) => {
      if (document.visibilityState == "visible") {
        this.tabActive = true;
        console.log('tab active');
      } else {
        this.tabActive = false;
        console.log('tab not active');
      }
    });

    /**
     * Updates window focus and blur events to detect when the window is focused
     * Window can be unfocused while the tab is active
     * Used for limiting auto copy to only when window is focused.
     */
    window.onfocus = () => {
      this.tabFocused = true;
    }
    window.onblur = () => {
      this.tabFocused = false;
    }

    /**
     * Subscribes to raid search subject
     * updates raidSearchFiltered variable with the new value
     */
    this.raidSearchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(value => {
      const filterValue = value.toLowerCase();

      this.impossibleRaids.filter = filterValue;
      this.standardRaids.filter = filterValue;

      if (value === '') return this.raidSearchFiltered = this.groupedRaids;

      this.impossibleRaids.filter = filterValue;
      this.standardRaids.filter = filterValue;

      return this.raidSearchFiltered = {
        standard: this.standardDifficulties.reduce((acc, difficulty) => {
          acc[difficulty] = this.groupedRaids.standard[difficulty].filter(raid => Object.values(raid).join().toLowerCase().includes(filterValue));
          return acc;
        }, {} as any),
        impossible: this.impossibleDifficulties.reduce((acc, difficulty) => {
          acc[difficulty] = this.groupedRaids.impossible[difficulty].filter(raid => Object.values(raid).join().toLowerCase().includes(filterValue));
          return acc;
        }, {} as any)
      }
    });

    /**
     * Initializes the dragula group
     * configures the columns to be dragable
     */
    this.dragulaService.createGroup("DRAGABLE_COLUMNS", {
      direction: 'horizontal',
      moves: (el, container, handle) => {
        return !!handle?.className.includes('dragula-handle');
      }
    });
    this.dragulaService.drop('DRAGABLE_COLUMNS').subscribe(drop => {
      this.settingsService.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
      this.settingsService.updateSettings();
    });

    /**
     * Load raid metadata. A list of all the raids and info about them.
     * from the backend
     */
    this.raid_metadata = await new Promise(resolve => {
      this.metadataService.getRaidMetadata().subscribe(metadata => {
        resolve(metadata);
      });
    });
    console.log(this.raid_metadata)

    /**
     * Creates specific groups from the list of all the raids that we just got above
     * Also groups these raids by their difficulty (stars in gbf ui)
     * Creates a group for filtered raids with no filter (all raids)
     * Creates a group for standard difficulty raids.
     * Creates a group for impossible difficulty raids.
     * TODO Future: Create a group for event/other raids
     */
    this.groupedRaids = this.raid_metadata.reduce((acc, curr) => {
      if (acc[curr.impossible === 1 ? 'standard' : 'impossible'][curr.thumbnail_image]) {
        acc[curr.impossible === 1 ? 'standard' : 'impossible'][curr.thumbnail_image].push(curr);
      }
      else acc[curr.impossible === 1 ? 'standard' : 'impossible'][curr.thumbnail_image] = [curr]

      //also populate list of standard and impossible raids.
      curr.impossible === 1 ? this.standardRaids.data.push(curr) : this.impossibleRaids.data.push(curr);
      return acc;
    }, { standard: {}, impossible: {} });
    this.raidSearchFiltered = this.groupedRaids;
    this.standardDifficulties = Object.keys(this.groupedRaids.standard);
    this.impossibleDifficulties = Object.keys(this.groupedRaids.impossible);

    /**
     * Handles a subscription event for when a user subscribes or unsubscribes to a raid
     * Creates a list of subscribed raids
     * Updates the 'selected' value for the filtered raids (so that it could show the border)
     * Updates the 'selected' value for grouped raids so that value could be used elsewhere 
     */
    this.socketioService.subscribedRaids.subscribe(subbed => {
      const subbedRaids: any[] = [];
      subbed.forEach(subbedRaid => {
        const found = this.raid_metadata.find(raidm => 'r' + raidm.quest_id === subbedRaid);
        if (found) subbedRaids.push(found);
      });
      this.subscribedRaids = subbedRaids;
      this.standardDifficulties.forEach(difficulty => {
        this.raidSearchFiltered.standard[difficulty] = this.raidSearchFiltered.standard[difficulty].map(raid => ({ ...raid, selected: subbed.has('r' + raid.quest_id) }));
        this.groupedRaids.standard[difficulty] = this.groupedRaids.standard[difficulty].map(raid => ({ ...raid, selected: subbed.has('r' + raid.quest_id) }));
      });
      this.impossibleDifficulties.forEach(difficulty => {
        this.raidSearchFiltered.impossible[difficulty] = this.raidSearchFiltered.impossible[difficulty].map(raid => ({ ...raid, selected: subbed.has('r' + raid.quest_id) }));
        this.groupedRaids.impossible[difficulty] = this.groupedRaids.impossible[difficulty].map(raid => ({ ...raid, selected: subbed.has('r' + raid.quest_id) }));
      });
      this.standardRaids.data = this.standardRaids.data.map(raid => ({ ...raid, selected: subbed.has('r' + raid.quest_id) }))
      this.impossibleRaids.data = this.impossibleRaids.data.map(raid => ({ ...raid, selected: subbed.has('r' + raid.quest_id) }))
      // this.subscribedRaids = this.raid_metadata.filter(raidm => subbed.has('r' + raidm.quest_id));
    });

    /**
     * Subscribes to status event from socket
     * curretnly doesn't really do anything with it except log it
     * usersConnected is just for monitoring, and might be inaccurate
     */
    this.socketioService.fromEvent('status').subscribe((status: string) => {
      this.lastStatusRecievedAt = new Date();
      const parsed = JSON.parse(status);
      this.status = parsed;
    });

    /**
     * Subscribes to raid event from socket
     * This is a basic raid info. Battle key and twitter user info.
     * Adds it to the raid list for the relevant quest Id so it shows up
     * Creates a set timeout to remove the raid after some amount of time
     * Also pops a raid from the list when tabbed out as to not increase list size
     */
    this.socketioService.getRaids().subscribe(raid => {
      const settings = this.settingsService.settings;
      if (this.raids[raid.quest_id]) {
        this.raids[raid.quest_id].unshift(raid);
      }
      else this.raids[raid.quest_id] = [raid];



      if (!settings.questSoundSettings[raid.quest_id]?.soundOnUpdate) this.notificationService.playSound(raid);
      if (!settings.questNotificationSettings[raid.quest_id]?.notificationOnUpdate) {
        const found = this.raid_metadata.find(meta => meta.quest_id === raid.quest_id);
        this.notificationService.scheduleNotification(raid, found.quest_name_en);
      }
      if (settings.questAutoCopySettings[raid.quest_id]?.enabled && this.tabActive && this.tabFocused) {
        this.selectRaid(raid);
      }

      /**
       * Remove the last raid on the list if the tab is inactive and there are
       * already more than 20 raids
       * OR if there are more than the set limit
       * also clears the set timeout for that raid.
       */
      if (
        (!this.tabActive && this.raids[raid.quest_id].length > 20) ||
        this.raids[raid.quest_id].length > settings.removeRaidsAfterLimit
      ) {
        const removedRaid = this.raids[raid.quest_id].pop();
        if (removedRaid.timeout) clearTimeout(removedRaid.timeout);
      }

      raid.timeout = setTimeout(() => {
        const index = this.raids[raid.quest_id].indexOf(raid);
        if (index >= 0) this.raids[raid.quest_id].splice(index, 1);
      }, 1000 * settings.removeRaidsAfterSeconds);
    });

    /**
     * Subscribes to update events from socket
     * These include info such as hp, players, time left, host class
     * Finds the raid and adds the updated info to it
     * does nothing if raid or quest DNE
     * Removes the raid if it hp/player filters are failed
     */
    this.socketioService.getUpdates().subscribe(update => {
      const raidIndex = this.raids[update.questID]?.findIndex(raid => raid.battleKey === update.battleKey);
      if (!this.raids[update.questID] || raidIndex === -1) return;
      const raid = this.raids[update.questID][raidIndex];
      raid.update = update;
      const players = +update.players?.split('/')[0];
      const settings = this.settingsService.settings;
      const maxPlayers = settings.maxPlayers === 0 ? 999 : settings.maxPlayers;
      const minPlayers = settings.minPlayers === 0 ? -1 : settings.minPlayers;

      if (update.hp < settings.minHP || update.hp > settings.maxHP || players < minPlayers || players > maxPlayers) {
        console.log(`removed raid ${raid.battleKey} > ${settings.minHP}<${update.hp}<=${settings.maxHP}?   ${minPlayers}<${players}<=${maxPlayers}?`)
        this.raids[raid.quest_id].splice(raidIndex, 1)
      } else {
        const found = this.raid_metadata.find(meta => meta.quest_id === raid.quest_id);
        if (settings.questSoundSettings[raid.quest_id]?.soundOnUpdate) this.notificationService.playSound(raid);
        if (settings.questNotificationSettings[raid.quest_id]?.notificationOnUpdate) this.notificationService.scheduleNotification(raid, found.quest_name_en);
      }
    });

    /**
     * When settings are loaded
     * Subscribes to all previously subscribed raids
     */
    this.settingsService.settings.subscribedRaidQuestIds.forEach(raidId => {
      this.subscribeRaid(raidId);
    })
  }

  ngOnDestroy() {
    if (this.formChangesSubscription) this.formChangesSubscription.unsubscribe();
    this.dragulaService.destroy('DRAGABLE_COLUMNS');
  }

  ngAfterViewInit(): void {
    const defaultSortingDataAccessor = (item: any, property: string) => {
      switch (property) {
        case 'name': return item.quest_name_en;
        default: return item[property];
      }
    };
    this.impossibleRaids.sortingDataAccessor = defaultSortingDataAccessor;
    this.standardRaids.sortingDataAccessor = defaultSortingDataAccessor;

    const filterPredicate = (data: any, filterValue: string) => {
      if (filterValue === '') return true;
      return Object.values(data).join().toLowerCase().includes(filterValue);
    }

    this.impossibleRaids.filterPredicate = filterPredicate;
    this.standardRaids.filterPredicate = filterPredicate;
  }

  /**
   * Open up a dialog from a given template
   * @param templateRef dialog template to open up
   */
  public openDialog(templateRef: TemplateRef<any>, infoDialog?: boolean) {
    this.dialog.open(templateRef).afterOpened().subscribe(dialog => {
      if (infoDialog) this.settingsService.updateMaintinence();
      try {
        this.formChangesSubscription = this.settingsForm.form.valueChanges.subscribe(changes => {
          this.settingsService.updateSettings();
        });
      } catch (error) { }
    });
  }

  /**
   * Open up a bottom sheet from a given template
   * @param templateRef bottom sheet template to open up
   */
  public openBottomSheet(templateRef: TemplateRef<any>) {
    const bottomSheet = this.bottomSheet.open(templateRef)
    bottomSheet.afterOpened().subscribe(bottomSheet => {
      try {
        this.formChangesSubscription = this.settingsForm.form.valueChanges.subscribe(changes => {
          this.settingsService.updateSettings();
        });
      } catch (error) { }
    });
    bottomSheet.backdropClick().subscribe(() => this.settingsService.updateSettings());
  }

  /**
   * Closes the bottom sheet
   */
  public closeBottomSheet() {
    this.bottomSheet.dismiss();
    this.settingsService.updateSettings();
  }

  /**
   * toggles a raid boss on or off
   * used in add raid dialog
   * updates settings afterwards
   * @param id quest id of the raid (ex '305241')
   */
  public toggleRaid(id: string) {
    this.socketioService.toggleRaid(id);
    this.settingsService.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.settingsService.updateSettings();
  }

  /**
   * Subscribes to a raid
   * updates settings afterwards
   * @param id quest id of the raid (ex '305241')
   */
  public subscribeRaid(id: string) {
    this.socketioService.subscribeRaid(id);
    this.settingsService.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.settingsService.updateSettings();
  }

  /**
   * Unsubscribes to a raid
   * updates settings afterwards
   * @param id quest id of the raid (ex '305241')
   */
  public unsubscribeRaid(id: string) {
    this.socketioService.unsubscribeRaid(id);
    this.settingsService.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.settingsService.updateSettings();
  }

  /**
   * When a tweeted raid is selected
   * Either oopens up a window or copies battle key to clipboard depending on settings
   * @param raid 
   */
  public async selectRaid(raid: any) {
    if (raid.update && !this.settingsService.settings.copyOnly) {
      const tab = this.settingsService.settings.openInTab ? '_blank' : 'gbfTab';
      window.open(`https://game.granbluefantasy.jp/${raid.update.link}`, tab, tab === '_blank' ? 'noreferrer' : '');
    } else {
      const result = await this.copyTextToClipboard(raid.battleKey, this.battleKeyInput);
      if (result) {
        this.snackBar.open(`Copied ${raid.battleKey}!`, '', { duration: 2000 });
        if (this.settingsService.settings.openInTab) {
          window.open(`https://game.granbluefantasy.jp/#quest/assist`, 'gbfTab');
        }
      } else {
        this.snackBar.open(`Unable to copy battle key.`, '', { duration: 2000 });
      }
      // navigator.clipboard.writeText(raid.battleKey).then(() => {
      //   this.snackBar.open(`Copied ${raid.battleKey}!`, '', { duration: 2000 });
      // }, () => {
      //   this.snackBar.open(`Unable to copy battle key.`, '', { duration: 2000 });
      // });
    }
    raid.selected = true;
  }

  /**
   * moves a raid column to the left
   * @param raid quest id of the raid
   */
  public moveQuestLeft(raid: any) {
    const raidIndex = this.subscribedRaids.indexOf(raid);
    if (raidIndex < 1) return;
    const temp_a = this.subscribedRaids[raidIndex]
    const temp_b = this.subscribedRaids[raidIndex - 1];
    this.subscribedRaids[raidIndex - 1] = temp_a;
    this.subscribedRaids[raidIndex] = temp_b;
    this.settingsService.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.settingsService.updateSettings();
  }

  /**
   * moves a raid column to the right
   * @param raid quest id of the raid
   */
  public moveQuestRight(raid: any) {
    const raidIndex = this.subscribedRaids.indexOf(raid);
    if (raidIndex > this.subscribedRaids.length - 2) return;
    const temp_a = this.subscribedRaids[raidIndex]
    const temp_b = this.subscribedRaids[raidIndex + 1];
    this.subscribedRaids[raidIndex + 1] = temp_a;
    this.subscribedRaids[raidIndex] = temp_b;
    this.settingsService.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.settingsService.updateSettings();
  }

  /**
   * clears all the tweets in the raid column
   * @param raid quest id of the raid
   */
  public clearAllRaidsInQuest(raid: any) {
    this.raids[raid.quest_id] = [];
  }

  /**
   * toggles quest notifications for the specific quest
   * @param raid quest id of the raid
   */
  public toggleQuestNotifications(raid: any) {
    const settings = this.settingsService.settings;
    settings.questNotificationSettings[raid.quest_id] ?
      settings.questNotificationSettings[raid.quest_id].enabled = !settings.questNotificationSettings[raid.quest_id].enabled :
      settings.questNotificationSettings[raid.quest_id] = { enabled: true, notificationOnUpdate: true }

    if (settings.questNotificationSettings[raid.quest_id]?.enabled) this.notificationService.requestNotificationPermission();

    this.settingsService.updateSettings();
  }

  /**
   * toggles quest sounds for the specific quest
   * @param raid quest id of the raid
   */
  public toggleQuestSound(raid: any) {
    const settings = this.settingsService.settings;
    settings.questSoundSettings[raid.quest_id] ?
      settings.questSoundSettings[raid.quest_id].enabled = !settings.questSoundSettings[raid.quest_id].enabled :
      settings.questSoundSettings[raid.quest_id] = { enabled: true, soundOnUpdate: false, sound: '' }
    this.settingsService.updateSettings();
  }

  /**
   * toggles extended menu for the specific quest
   * @param raid quest id of the raid
   */
  public toggleQuestExtendedMenu(raid: any) {
    const settings = this.settingsService.settings;
    settings.questExtendedMenu[raid.quest_id] ?
      settings.questExtendedMenu[raid.quest_id].visible = !settings.questExtendedMenu[raid.quest_id].visible :
      settings.questExtendedMenu[raid.quest_id] = { visible: true }
    this.settingsService.updateSettings();
  }

  /**
   * toggles auto copy settings for the specific quest
   * @param raid quest id of the raid
   */
  public toggleQuestAutoCopy(raid: any) {
    const settings = this.settingsService.settings;
    settings.questAutoCopySettings[raid.quest_id] ?
      settings.questAutoCopySettings[raid.quest_id].enabled = !settings.questAutoCopySettings[raid.quest_id].enabled :
      settings.questAutoCopySettings[raid.quest_id] = { enabled: true }
    this.settingsService.updateSettings();
  }

  /**
   * Copies the latest raid that appeared in the column.
   * @param raid quest id of the raid
   */
  public copyLatestRaid(raid: any, raidCard: any) {
    if (this.raids[raid.quest_id] && this.raids[raid.quest_id].length) {
      const found = this.settingsService.settings.copyOnly ?
        this.raids[raid.quest_id].find(item => !item.selected) :
        this.raids[raid.quest_id].find(item => !item.selected && item.update);

      this.selectRaid(found);
    }
  }

  /**
   * Copies text to clipboard
   * @param text text to copy to clipboard
   */
  public async copyTextToClipboard(text: string, inputElement: any): Promise<boolean> {
    // return this.notificationService.copyTextToClipboard(text, inputElement);
    if (navigator && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const element = inputElement.nativeElement;
    const previouslyFocusedElement: any = document.activeElement;
    element.value = text;

    const range = document.createRange();
    range.selectNodeContents(inputElement);
    
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    let isSuccess = false;
    try {
      isSuccess = document.execCommand('copy');
    } catch { }

    selection?.removeAllRanges();

    // Get the focus back on the previously focused element, if any
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }

    return isSuccess;
  }

  public gotoStats() {
    this.router.navigate(['/stats']);
  }

  public updateSettings() {
    this.settingsService.updateSettings();
  }

}
