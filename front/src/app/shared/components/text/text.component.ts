import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'mat-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.less']
})
export class TextComponent implements OnInit {

  @Input() type: string = '';

  constructor() { }

  ngOnInit(): void {
  }

}
