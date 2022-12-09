import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DialogComponent } from './components/dialog/dialog.component';
import { MaterialModule } from '../material.module';
import { TextComponent } from './components/text/text.component';

@NgModule({
  declarations: [
    DialogComponent,
    TextComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MaterialModule,
  ],
  exports: [
    DialogComponent,
    TextComponent
  ]
})
export class SharedModule { }
