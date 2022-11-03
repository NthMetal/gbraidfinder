import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'mat-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.less']
})
export class DialogComponent implements OnInit {

  @Input() width: 'small' | 'medium' | 'large' | 'auto' = 'auto';
  @Input() height: 'small' | 'medium' | 'large' = 'medium';
  @Input() header: string = '';

  constructor(private dialog: MatDialog) { }

  ngOnInit(): void {
  }

  public closeDialog() {
    this.dialog.closeAll();
  }

}
