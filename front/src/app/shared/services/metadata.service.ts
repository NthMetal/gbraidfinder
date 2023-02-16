import { Injectable } from '@angular/core';
import { ReplaySubject, Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
  providedIn: 'root'
})
export class MetadataService extends ApiService {
  
  private raid_metadata: ReplaySubject<any> = new ReplaySubject<any>();

  init(): void {
    this.get('/get_raid_metadata').subscribe(metadata => {
      this.raid_metadata.next(metadata);
    });
  }

  public getRaidMetadata() {
    return this.raid_metadata;
  }

  public getHistoricalStats(questId: string, start: Date, end: Date, count: number) {
    return new Promise<any>(resolve => {
      this.get_stats(`/stats?questId=${questId}&start=${start.getTime()}&end=${end.getTime()}&interval=${1}&count=${count}`).subscribe(data => {
        resolve(data);
      });
    });
  }

  public postRaid(battleKey: string) {
    return new Promise<any>(resolve => {
      this.post(`/r/${battleKey}`).subscribe(data => {
        resolve(data);
      });
    });
  }

}
