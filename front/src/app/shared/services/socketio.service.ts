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
    // const url = '';
    const url = 'http://a890d0112283f441c97c59d563d05071-370247399.us-east-2.elb.amazonaws.com';
    // const url = environment.production ? 'http://a45046720dba34164b9cf84c303ad1b7-561645660.us-east-2.elb.amazonaws.com' : 'http://localhost:3000';
    console.log('connecting to socket', url);
    this.socket = Socket.io(url, configOptions);

    // TEST/PROD
    // this.socket = io('', configOptions );

    // LOCAL
    // this.socket = io('https://ec2-3-17-133-200.us-east-2.compute.amazonaws.com', configOptions );
    // this.socket = io('http://localhost:8080', configOptions );

    // const apiUrl = authenticationService.configData.API_URL;
    // // const options = {
    // //   secure: true
    // // };
    // // this.config = apiUrl.indexOf('localhost') > -1 ?
    // //   { url: apiUrl, options: { ...options } } :

    // //   { url: '', options: { path: `${apiUrl}/socket.io`, ...options } };
    // const url = 'http://localhost:8083';
    // this.socket = io(url, { path: `/socket.io` });
    // // this.socket = io(url);
    // console.log(this.socket);
    // setInterval(() => {
    // this.assetCreated('1234');
    // }, 3000);
    this.socket.on('connect', () => {
      console.log('connected......................................');
      this.connected = true;
    });
    this.socket.on('event', function (data: any) {
      console.log('evnet.............................', data);
    });
    this.socket.on('disconnect', function () {
      console.log('disconnected......................................');
    });
  }

  public subscribeRaid(id: string): void {
    this.subscribedRaids.next(this.subscribedRaids.getValue().add('r' + id));
    this.socket.emit('subscribe', 'r' + id);
    this.socket.emit('subscribe', 'u' + id);
  }

  public unsubscribeRaid(id: string): void {
    const currentSubbed = this.subscribedRaids.getValue();
    currentSubbed.delete('r' + id);
    this.subscribedRaids.next(currentSubbed);
    this.socket.emit('unsubscribe', 'r' + id);
    this.socket.emit('unsubscribe', 'u' + id);
  }

  public toggleRaid(id: string): void {
    this.subscribedRaids.getValue().has('r' + id) ? this.unsubscribeRaid(id) : this.subscribeRaid(id);
  }

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

  public fromEvent(eventName: string): Observable<any> {
    this.subscribersCounter++;
    return new Observable((observer) => {
      this.socket.on(eventName, (data: any) => {
        const inflatedData = pako.inflate(data, { to: 'string' });
        // console.log(
        //   'bytes sent before: ', JSON.stringify(inflatedData).length,
        //   'bytes sent after: ', (data as ArrayBuffer).byteLength,
        //   'difference', JSON.stringify(inflatedData).length - (data as ArrayBuffer).byteLength,
        //   'ratio', JSON.stringify(inflatedData).length / (data as ArrayBuffer).byteLength,
        //   'trades', inflatedData.split(',').length
        // );
        // console.log(inflatedData);
        observer.next(inflatedData);
      });
    }).pipe(share());
  }
}
