import { Component, ElementRef, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DragulaService } from 'ng2-dragula';
import { MetadataService } from './shared/services/metadata.service';
import { SocketioService } from './shared/services/socketio.service';

import { NgForm } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject, Subscription } from 'rxjs';
import { NotificationService } from './shared/services/notification.service';
import { SettingsService } from './shared/services/settings.service';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit, OnDestroy {

  ngOnDestroy(): void {
    
  }

  ngOnInit(): void {

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