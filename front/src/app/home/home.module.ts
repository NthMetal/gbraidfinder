import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import { MaterialModule } from '../material.module';
import { SharedModule } from '../shared/shared.module';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { TimeagoModule } from 'ngx-timeago';
import { DragulaModule } from 'ng2-dragula';


@NgModule({
  declarations: [
    HomeComponent
  ],
  imports: [
    CommonModule,
    HomeRoutingModule,
    SharedModule,
    MaterialModule,
    NgxSliderModule,
    TimeagoModule.forRoot(),
    DragulaModule.forRoot()
  ]
})
export class HomeModule { }
