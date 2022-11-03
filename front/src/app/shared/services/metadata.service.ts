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
}
