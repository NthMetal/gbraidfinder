import { Injectable } from '@angular/core';
import pako from 'pako';
import { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';
import { map, share } from 'rxjs/operators';
import * as Socket from 'socket.io-client';
import { environment } from '../../../environments/environment';
// import { Socket } from 'ngx-socket-io';

@Injectable({
  providedIn: 'root'
})
export class SocketioService {
  private socket: Socket.Socket;
  private subscribersCounter = 0;
  public subscribedRaids: BehaviorSubject<Set<string>> = new BehaviorSubject<Set<string>>(new Set());
  private config: {
    url: string,
    options: Partial<Socket.ManagerOptions & Socket.SocketOptions> | undefined
  };

  notificationReplay: ReplaySubject<any> = new ReplaySubject<any>();
  statusSubject: BehaviorSubject<any[]> = new BehaviorSubject<any>([]);

  public connected = false;


  constructor() {
    console.log('constructed')
    // setTimeout(() => {
    this.initSocket();
    // }, 1000);
    // // this.socket = io(this.config.url, this.config.options);
  }

  private initSocket() {
    const _this = this;
    const options = {
      secure: true
    };
    // this.config.options.secure = true;
    const configOptions: Partial<Socket.ManagerOptions & Socket.SocketOptions> | undefined = {
      // forceNew: false,
      // multiplex: true,
      // path: '/socket.io',
      // reconnection: true,
      reconnectionAttempts: 10,
      // reconnectionDelay: 1000,
      // reconnectionDelayMax: 5000,
      // randomizationFactor: 0.5,
      // timeout: 20000,
      // autoConnect: true,
      // host: 'http://localhost:3000',
      // hostname: 'localhost',
      // secure: true,
      // port: '3000',
      // query: '',
      // agent: false,
      // upgrade: false,
      // forceJSONP: false,
      // jsonp: true,
      // forceBase64: false,
      // enablesXDR: false,
      // timestampParam: 't',
      // timestampRequests: false,
      // transports: ['websocket'],
      // policyPost: 843,
      // rememberUpgrade: false,
      // onlyBinaryUpgrades: false,
      // transportOptions: {
      //   polling: {
      //     extraHeaders: {
      //       'X-Auth-UserID': user ? user.pkId : 'aaa'
      //     }
      //   }
      // },
      // pfx: undefined,
      // key: undefined,
      // passphrase: undefined,
      // cert: undefined,
      // ca: undefined,
      // ciphers: undefined,
      // rejectUnauthorized: false
    };
    // const url = 'http://a27afc9d69f9d4c869231eac09110c27-46112890.us-east-2.elb.amazonaws.com';
    const url = environment.production ? 'https://gbraidfinderapi.ogres.cc' : 'http://gbraidfinderapi.ogres.cc';
    console.log('connecting to socket', url);
    this.socket = Socket.io(url, configOptions);

    this.socket.on('connect', () => {
      console.log('connected......................................');
      this.connected = true;
    });
    this.socket.on('disconnect', function () {
      console.log('disconnected......................................');
    });
  }

  /**
   * subscribes to a specific raid
   * subscribes to r305241 for tweeted raids and
   * u305241 for raid updates
   * @param id quest id of the raid (ex '305241')
   */
  public subscribeRaid(id: string): void {
    this.subscribedRaids.next(this.subscribedRaids.getValue().add('r' + id));
    this.socket.emit('subscribe', 'r' + id);
    this.socket.emit('subscribe', 'u' + id);
  }

  /**
   * unsubscribes from a specific raid
   * unsubscribes from r305241 for tweeted raids and
   * u305241 for raid updates
   * @param id quest id of the raid (ex '305241')
   */
  public unsubscribeRaid(id: string): void {
    const currentSubbed = this.subscribedRaids.getValue();
    currentSubbed.delete('r' + id);
    this.subscribedRaids.next(currentSubbed);
    this.socket.emit('unsubscribe', 'r' + id);
    this.socket.emit('unsubscribe', 'u' + id);
  }

  /**
   * toggles a quest; Subscribes or unsubscribes depending
   * @param id quest id of the raid (ex '305241')
   */
  public toggleRaid(id: string): void {
    this.subscribedRaids.getValue().has('r' + id) ? this.unsubscribeRaid(id) : this.subscribeRaid(id);
  }

  /**
   * gets an observable that fires every time a raid is recieved
   * @returns raids observable
   */
  public getRaids(): Observable<any> {
    return this.fromEvent('raid').pipe(map((raidString: string) => {
      const split = raidString.split('|');
      return {
        twitterUser: {
            name: split[0],
            imgUrl: split[1],
            username: split[2],
            verified: !!+split[3]
        },
        created_at: new Date(),
        locale: !!+split[4] ? 'EN' : 'JP',
        message: split[8] ?? '',
        battleKey: split[5],
        quest_id: split[6]
      };
    }));
  }

  /**
   * gets an observable that fires every time an update is recieved
   * @returns updates observable
   */
  public getUpdates(): Observable<any> {
    return this.fromEvent('update').pipe(map((updateString: string) => {
      const split = updateString.split('|');
      // `${update.link}|${update.hp}|${update.players.replace('%2F', '/')}|` +
      // `${update.timeLeft.replace('%3A', ':').replace('%3A', ':')}|` +
      // `${update.questHostClass}|${update.questID}|${update.battleKey}`;
      return {
        link: split[0],
        hp: +split[1] ?? 0,
        players: split[2],
        timeLeft: split[3],
        questHostClass: split[4],
        questID: split[5],
        battleKey: split[6]
      };
    }));
  }

  /**
   * creates a shared observable for a given socket event
   * @param eventName socket event
   * @returns shared observable
   */
  public fromEvent(eventName: string): Observable<any> {
    this.subscribersCounter++;
    return new Observable((observer) => {
      this.socket.on(eventName, (data: any) => {
        const inflatedData = pako.inflate(data, { to: 'string' });
        observer.next(inflatedData);
      });
    }).pipe(share());
  }
}
