import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { StatsRoutingModule } from './stats-routing.module';
import { StatsComponent } from './stats.component';
import { MaterialModule } from '../material.module';
import { SharedModule } from '../shared/shared.module';


@NgModule({
  declarations: [
    StatsComponent
  ],
  imports: [
    CommonModule,
    StatsRoutingModule,
    SharedModule,
    MaterialModule
  ]
})
export class StatsModule { }
