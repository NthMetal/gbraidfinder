import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { DialogComponent } from './components/dialog/dialog.component';
import { MaterialModule } from '../material.module';
import { TextComponent } from './components/text/text.component';
import { TvChartContainerComponent } from './components/tv-chart-container/tv-chart-container.component';

@NgModule({
  declarations: [
    DialogComponent,
    TextComponent,
    TvChartContainerComponent
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    MaterialModule,
  ],
  exports: [
    DialogComponent,
    TextComponent,
    TvChartContainerComponent
  ]
})
export class SharedModule { }
