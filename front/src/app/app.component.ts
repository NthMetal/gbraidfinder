import { Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DragulaService } from 'ng2-dragula';
import { MetadataService } from './shared/services/metadata.service';
import { SocketioService } from './shared/services/socketio.service';

import { NgForm } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('settingsForm') settingsForm: NgForm;

  raid_metadata: any[] = [];
  subscribedRaids: any[] = [];

  raids: { [quest_id: string]: any[] } = {};

  settings = {
    subscribedRaidQuestIds: [] as string[],
    enabledGlobalNotifications: true,
    enabledSoundNotifications: true,
    // display: 'vertical',
    // columnWidth: 20,
    // language: 'EN',
    removeRaidsAfterSeconds: 120,

    copyOnly: false,
    removeDuplicates: false,
    minHP: 0,
    maxHP: 100,
    minPlayers: 0,
    maxPlayers: 0,
    openInTab: '_blank',
    theme: 'dark'
  }

  formChangesSubscription: Subscription;

  usersConnected = 0;

  raidSearch = '';
  raidSearchSubject = new Subject<string>();
  raidSearchFiltered: { standard: { [key: string]: any[] }, impossible: { [key: string]: any[] } };
  
  elements: string[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'normal']
  joinLevels: number[] = []
  groupedRaids: { standard: { [key: string]: any[] }, impossible: { [key: string]: any[] } };
  standardDifficulties: string[] = [];
  impossibleDifficulties: string[] = [];

  tabActive = true;

  constructor(
    private router: Router,
    public socketioService: SocketioService,
    private dialog: MatDialog,
    private metadataService: MetadataService,
    private snackBar: MatSnackBar,
    private dragulaService: DragulaService
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
     * Get settings from local storage.
     */
    this.settings = JSON.parse(localStorage.getItem('settings') || JSON.stringify(this.settings));
    
    /**
     * Subscribes to raid search subject
     * updates raidSearchFiltered variable with the new value
     */
    this.raidSearchSubject.pipe(debounceTime(400), distinctUntilChanged()).subscribe(value => {
      if (value === '') return this.raidSearchFiltered = this.groupedRaids;
      const filterValue = value.toLowerCase();
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
      // this.subscribedRaids = this.raid_metadata.filter(raidm => subbed.has('r' + raidm.quest_id));
    });

    /**
     * Subscribes to status event from socket
     * curretnly doesn't really do anything with it except log it
     * usersConnected is just for monitoring, and might be inaccurate
     */
    this.socketioService.fromEvent('status').subscribe((status: string) => {
      const parsed = JSON.parse(status);
      this.usersConnected = parsed.usersConnected;
      console.log('GOT STATUS', status);
    });
    
    /**
     * Subscribes to raid event from socket
     * This is a basic raid info. Battle key and twitter user info.
     * Adds it to the raid list for the relevant quest Id so it shows up
     * Creates a set timeout to remove the raid after some amount of time
     * Also pops a raid from the list when tabbed out as to not increase list size
     */
    this.socketioService.getRaids().subscribe(raid => {
      if (this.raids[raid.quest_id]) {
        this.raids[raid.quest_id].unshift(raid);
        if (!this.tabActive) { this.raids[raid.quest_id].pop() }
      }
      else this.raids[raid.quest_id] = [raid];
      setTimeout(() => {
        const index = this.raids[raid.quest_id].indexOf(raid);
        if (index >= 0) this.raids[raid.quest_id].splice(index, 1);
      }, 1000 * this.settings.removeRaidsAfterSeconds);
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
      const maxPlayers = this.settings.maxPlayers === 0 ? 999 : this.settings.maxPlayers;
      const minPlayers = this.settings.minPlayers === 0 ? -1 : this.settings.minPlayers;

      if (update.hp < this.settings.minHP || update.hp > this.settings.maxHP || players <= minPlayers || players > maxPlayers) {
        console.log(`removed raid ${raid.battleKey} > ${this.settings.minHP}<${update.hp}<=${this.settings.maxHP}?   ${minPlayers}<${players}<=${maxPlayers}?`)
        this.raids[raid.quest_id].splice(raidIndex, 1)
      }
    });

    /**
     * When settings are loaded
     * Subscribes to all previously subscribed raids
     */
    this.settings.subscribedRaidQuestIds.forEach(raidId => {
      this.subscribeRaid(raidId);
    })
  }

  ngOnDestroy() {
    this.formChangesSubscription.unsubscribe();
  }

  public openDialog(templateRef: TemplateRef<any>) {
    this.dialog.open(templateRef).afterOpened().subscribe(dialog => {
      try {
        this.formChangesSubscription = this.settingsForm.form.valueChanges.subscribe(changes => {
          this.updateSettings();
        });
      } catch (error) { }
    });
  }

  public toggleRaid(id: string) {
    this.socketioService.toggleRaid(id);
    this.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.updateSettings();
  }

  public subscribeRaid(id: string) {
    this.socketioService.subscribeRaid(id);
  }

  public unsubscribeRaid(id: string) {
    this.socketioService.unsubscribeRaid(id);
    this.settings.subscribedRaidQuestIds = this.subscribedRaids.map(raid => raid.quest_id);
    this.updateSettings();
  }

  public selectRaid(raid: any) {
    raid.selected = true;
    if (raid.update && !this.settings.copyOnly) {
      const tab = this.settings.openInTab || '_blank';
      window.open(`https://game.granbluefantasy.jp/${raid.update.link}`, tab, tab === '_blank' ? 'noreferrer' : '');
    } else {
      const result = this.copyTextToClipboard(raid.battleKey);
      result ? this.snackBar.open(`Copied ${raid.battleKey}!`, '', { duration: 2000 }) : 
      this.snackBar.open(`Unable to copy battle key.`, '', { duration: 2000 });
      // navigator.clipboard.writeText(raid.battleKey).then(() => {
      //   this.snackBar.open(`Copied ${raid.battleKey}!`, '', { duration: 2000 });
      // }, () => {
      //   this.snackBar.open(`Unable to copy battle key.`, '', { duration: 2000 });
      // });
    }
  }

  public moveQuestLeft(raid: any) {
    const raidIndex = this.subscribedRaids.indexOf(raid);
    if (raidIndex < 1) return;
    const temp_a = this.subscribedRaids[raidIndex]
    const temp_b = this.subscribedRaids[raidIndex - 1];
    this.subscribedRaids[raidIndex - 1] = temp_a;
    this.subscribedRaids[raidIndex] = temp_b;
    this.updateSettings();
  }

  public moveQuestRight(raid: any) {
    const raidIndex = this.subscribedRaids.indexOf(raid);
    if (raidIndex > this.subscribedRaids.length - 2) return;
    const temp_a = this.subscribedRaids[raidIndex]
    const temp_b = this.subscribedRaids[raidIndex + 1];
    this.subscribedRaids[raidIndex + 1] = temp_a;
    this.subscribedRaids[raidIndex] = temp_b;
    this.updateSettings();
  }

  public clearAllRaidsInQuest(raid: any) {
    this.raids[raid.quest_id] = [];
  }

  public toggleQuestNotifications(raid: any) {
    raid.notifications = !raid.notifications;
    this.updateSettings();
  }

  public toggleQuestSound(raid: any) {
    raid.sound = !raid.sound;
    this.updateSettings();
  }

  private updateSettings() {
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  private copyTextToClipboard(input: any, { target = document.body } = {}) {
    const element = document.createElement('textarea');
    const previouslyFocusedElement: any = document.activeElement;

    element.value = input;

    // Prevent keyboard from showing on mobile
    element.setAttribute('readonly', '');

    // element.style.contain = 'strict';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    element.style.fontSize = '12pt'; // Prevent zooming on iOS

    const selection: any = document.getSelection();
    const originalRange = selection.rangeCount > 0 && selection.getRangeAt(0);

    target.append(element);
    element.select();

    // Explicit selection workaround for iOS
    element.selectionStart = 0;
    element.selectionEnd = input.length;

    let isSuccess = false;
    try {
      isSuccess = document.execCommand('copy');
    } catch { }

    element.remove();

    if (originalRange) {
      selection.removeAllRanges();
      selection.addRange(originalRange);
    }

    // Get the focus back on the previously focused element, if any
    if (previouslyFocusedElement) {
      previouslyFocusedElement.focus();
    }

    return isSuccess;
  }

}

// {
//   "20": 6,
//   "30": 6,
//   "40": 10,
//   "80": 5,
//   "101": 8,
//   "120": 21,
//   "130": 1,
//   "150": 3,
//   "151": 6,
//   "170": 2,
//   "200": 3
// }