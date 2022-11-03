import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Observable } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { RaidService } from './services/raid/raid.service';
import { SocketUtils } from './socket.utils';
import { Raid } from './types/raid';

@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    socket: Server;

    socketUtils: SocketUtils;

    usersConnected = 0;

    // constructor() {}
    constructor(private raidService: RaidService) {}

    async afterInit(socket: Socket) {
        this.socketUtils = new SocketUtils(this.socket);

        // const exampleObservable = (new Observable(sub => {setInterval(() => { sub.next({example: 'raid'}) }, 2000)}));
        // exampleObservable.subscribe(raid => {
        //     this.socketUtils.emitToRoom('raid.room', 'raid', raid as any);
        // });
        this.raidService.getRaids().subscribe(raid => {
            // {
            //     twitterUser: {
            //         name: string,
            //         imgUrl: string,
            //         username: string,
            //         verified: boolean
            //     },
            //     locale: 'EN' | 'JP',
            //     message: string,
            //     battleKey: string,
            //     quest_id: string;
            // }
            const urlSplit = /(.*)\/(.*)\/(.*)$/g.exec(raid.twitterUser.imgUrl);
            const imgUrlShort = raid.twitterUser.imgUrl[8] === 'a' ? 'a' : `${urlSplit[2]}/${urlSplit[3]}`;
            const sanitizedName = raid.twitterUser.name.replace('|', 'l');
            const sanitizedMessage = raid.message.replace('|', 'l');

            const miniRaid = `${sanitizedName}|${imgUrlShort}|${raid.twitterUser.username}` +
                            `|${+raid.twitterUser.verified}|${+(raid.locale === 'EN')}|${raid.battleKey}` +
                            `|${raid.quest_id}|${raid.created_at}|${sanitizedMessage}`;
            this.socketUtils.emitToRoom('r'+raid.quest_id, 'raid', miniRaid);
        });

        this.raidService.getUpdates().subscribe(update => {
            // {
            //     resultStatus: 'success',
            //     link: '#quest/supporter_raid/30467231476/305171/1/3/0/6',
            //     hp: '86',
            //     players: '3%2F30',
            //     timeLeft: '01%3A28%3A48',
            //     questHostClass: '410301',
            //     raidPID: '30467231476',
            //     questID: '305171',
            //     battleKey: raid.battleKey
            // }

            const miniUpdate = `${update.link}|${update.hp}|${update.players.replace('%2F', '/')}|` +
                               `${update.timeLeft.replace('%3A', ':').replace('%3A', ':')}|` +
                               `${update.questHostClass}|${update.questID}|${update.battleKey}`;
            this.socketUtils.emitToRoom('u'+update.questID, 'update', miniUpdate);
        });
        // Send status
        setInterval(() => {
            this.socketUtils.emitStatus(this.socket, this.usersConnected);
        }, 60000);
    }

    handleDisconnect(socket: Socket) {
        this.usersConnected--;
        console.log('USER CONNECTED<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', this.usersConnected);
    }

    async handleConnection(socket: Socket) {
        this.usersConnected++;
        this.socketUtils.emitStatus(socket, this.usersConnected);
        console.log('USER CONNECTED======================================================', this.usersConnected, Object.keys(this.socket?.sockets || {}).length);
        // const miniRaid = `username|a|twusername` +
        //                  `|0|0|12345678` +
        //                  `|305171|2022-10-28T02:55:12.000Z|`;
        // const miniRaidcopy = `username|a|twusername` +
        //                  `|0|0|12345679` +
        //                  `|305171|2022-10-28T02:55:12.000Z|@tos`;
        // const miniRaid2= `username|1046707735033565184/g_oRfx2P_normal.jpg|twitteruser` +
        //                  `|1|1|ABCDEFGH` +
        //                  `|305171|2022-10-28T02:55:12.000Z|@tos`;
        // const miniUpdate = `#quest/supporter_raid/30467231476/305171/1/3/0/6|66|14/30|` +
        //                    `01:24:45|` +
        //                    `100001|305171|12345678`;
        // const miniUpdatecopy = `#quest/supporter_raid/30467231476/305171/1/3/0/6|66|14/30|` +
        //                    `01:24:45|` +
        //                    `100001|305171|12345679`;
        // setTimeout(() => {
        //     this.socketUtils.emitToRoom('r305171', 'raid', miniRaid);
        //     this.socketUtils.emitToRoom('r305171', 'raid', miniRaid2);
        //     this.socketUtils.emitToRoom('r305171', 'raid', miniRaidcopy);
        // },1000);
        // setTimeout(() => {
        //     this.socketUtils.emitToRoom('u305171', 'update', miniUpdate);
        //     this.socketUtils.emitToRoom('u305171', 'update', miniUpdatecopy);
        // }, 2000);
    }

    @SubscribeMessage('subscribe')
    async handleSubscribeRequests(
        @MessageBody() raidRoom: string,
        @ConnectedSocket() socket: Socket,
    ) {
        console.log(`subscribing user: ${socket.id} to room ${raidRoom}`);
        socket.join(raidRoom);
    }

    @SubscribeMessage('subscribemultiple')
    async handleMultiSubscribeRequests(
        @MessageBody() raidRooms: string,
        @ConnectedSocket() socket: Socket,
    ) {
        const parsedRaidRooms = raidRooms.split(',');
        console.log(`subscribing user: ${socket.id} to rooms ${raidRooms}`);
        socket.join(parsedRaidRooms);
    }

    @SubscribeMessage('unsubscribe')
    async handleUnsubscribeRequests(
        @MessageBody() raidRoom: string,
        @ConnectedSocket() socket: Socket,
    ) {
            console.log(`unsubscribing user: ${socket.id} from room ${raidRoom}`);
            socket.leave(raidRoom);
    }

    @SubscribeMessage('unsubscribeall')
    async handleUnsubscribeAllRequests(
        @ConnectedSocket() socket: Socket,
    ) {
            console.log(`unsubscribing user: ${socket.id} from all rooms`);
            socket.rooms.forEach(room => { socket.leave(room) })
    }

}
