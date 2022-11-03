import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MetadataService } from '../shared/services/metadata.service';
import { SocketioService } from '../shared/services/socketio.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.less']
})
export class HomeComponent implements OnInit, AfterViewInit {

  constructor() { }

  async ngOnInit(): Promise<void> {


  }

  ngAfterViewInit(): void {

  }

}
