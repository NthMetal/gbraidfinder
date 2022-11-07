import { Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DragulaService } from 'ng2-dragula';
import { MetadataService } from './shared/services/metadata.service';
import { SocketioService } from './shared/services/socketio.service';

import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { FormControl, NgForm } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map, Observable, startWith, Subject, Subscription } from 'rxjs';
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput: ElementRef;
  @ViewChild(MatAutocompleteTrigger, { read: MatAutocompleteTrigger }) matAutoComplete: MatAutocompleteTrigger;
  @ViewChild('settingsForm') settingsForm: NgForm;

  separatorKeysCodes: number[] = [ENTER, COMMA];
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

  subbedQuestsCtrl = new FormControl();
  filteredQuests: Observable<any[]>;

  usersConnected = 0;

  raidSearch = '';
  raidSearchSubject = new Subject<string>();
  raidSearchFiltered: { standard: { [key: string]: any[] }, impossible: { [key: string]: any[] } };

  constructor(
    private router: Router,
    public socketioService: SocketioService,
    private dialog: MatDialog,
    private metadataService: MetadataService,
    private snackBar: MatSnackBar,
    private dragulaService: DragulaService
  ) { }

  elements: string[] = ['fire', 'water', 'earth', 'wind', 'light', 'dark', 'normal']
  joinLevels: number[] = []
  groupedRaids: { standard: { [key: string]: any[] }, impossible: { [key: string]: any[] } };
  standardDifficulties: string[] = [];
  impossibleDifficulties: string[] = [];

  tabActive = true;

  async ngOnInit(): Promise<void> {
    document.addEventListener("visibilitychange", (event) => {
      if (document.visibilityState == "visible") {
        this.tabActive = true;
        console.log('tab active');
      } else {
        this.tabActive = false;
        console.log('tab not active');
      }
    });

    this.settings = JSON.parse(localStorage.getItem('settings') || JSON.stringify(this.settings));

    this.filteredQuests = this.subbedQuestsCtrl.valueChanges.pipe(
      startWith(null),
      map(raid => raid ? this._filter(raid) : this.raid_metadata.slice()));
    
    this.raidSearchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged())
      .subscribe(value => {
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

    this.dragulaService.createGroup("DRAGABLE_COLUMNS", {
      direction: 'horizontal',
      moves: (el, container, handle) => {
        return !!handle?.className.includes('dragula-handle');
      }
    });

    this.raid_metadata = await new Promise(resolve => {
      this.metadataService.getRaidMetadata().subscribe(metadata => {
        resolve(metadata);
      });
    });
    console.log(this.raid_metadata)

    // this.joinLevels = [...new Set(this.raid_metadata.map(raid => raid.level))].sort((a, b) => a - b)
    // this.toggleRaid('305171');
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
    this.impossibleDifficulties = Object.keys(this.groupedRaids.impossible);

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
    this.socketioService.fromEvent('status').subscribe((status: string) => {
      const parsed = JSON.parse(status);
      this.usersConnected = parsed.usersConnected;
      console.log('GOT STATUS', status);
    });
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
    this.socketioService.getUpdates().subscribe(update => {
      const raidIndex = this.raids[update.questID]?.findIndex(raid => raid.battleKey === update.battleKey);
      if (!this.raids[update.questID] || raidIndex === -1) return;
      const raid = this.raids[update.questID][raidIndex];
      raid.update = update;
      const players = +update.players?.split('/')[0];
      const maxPlayers = this.settings.maxPlayers === 0 ? 999 : this.settings.maxPlayers;
      const minPlayers = this.settings.minPlayers === 0 ? -1 : this.settings.minPlayers;

      if (update.hp <= this.settings.minHP || update.hp > this.settings.maxHP || players <= minPlayers || players > maxPlayers) {
        this.raids[raid.quest_id].splice(raidIndex, 1)
      }
    });

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


  // Search autocomplete

  public add(event: MatChipInputEvent): void {
    const input = event.input;
    const value = event.value;
    console.log(value);
    // // Add our fruit
    if ((value || '').trim()) {
      // this.socketioService.subscribeRaid(raidToSub.quest_id)
    }

    // Reset the input value
    if (input) {
      input.value = '';
    }

    this.subbedQuestsCtrl.setValue(null);
  }

  public remove(quest: any): void {
    this.socketioService.unsubscribeRaid(quest.quest_id);
    this.updateSettings();
  }

  public selected(event: MatAutocompleteSelectedEvent): void {
    this.socketioService.subscribeRaid(event.option.value.quest_id);
    this.searchInput.nativeElement.value = '';
    this.searchInput.nativeElement.blur();
    this.searchInput.nativeElement.focus();
    this.subbedQuestsCtrl.setValue(null);
    this.matAutoComplete.openPanel();
    this.updateSettings();
  }

  private _filter(value: string): any[] {
    if (!value.toLowerCase) return this.raid_metadata;
    const filterValue = value.toLowerCase();
    const filter = this.raid_metadata.filter(raid => Object.values(raid).join().toLowerCase().includes(filterValue));
    console.log(filterValue, filter);
    return filter;
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