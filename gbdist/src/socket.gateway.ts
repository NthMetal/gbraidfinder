import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { KafkaService } from './kafka.service';
import { SocketUtils } from './socket.utils';

@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    socket: Server;

    socketUtils: SocketUtils;

    usersConnected = 0;

    constructor(private kafkaService: KafkaService) {}

    async afterInit(socket: Socket) {
        this.socketUtils = new SocketUtils(this.socket);

        this.kafkaService.raids.subscribe(raid => {
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
            const sanitizedMessage = raid.message.replace('|', 'l');

            const miniRaid = `none|a|none` +
                            `|0|${+(raid.locale === 'EN')}|${raid.battleKey}` +
                            `|${raid.quest_id}|${raid.created_at}|${sanitizedMessage}`;
            console.log(JSON.stringify(raid));
            this.socketUtils.emitToRoom('r'+raid.quest_id, 'raid', miniRaid);
        });

        this.kafkaService.updates.subscribe(update => {
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
            console.log(update);
            const miniUpdate = `${update.link}|${update.hp}|${update.players.replace('%2F', '/')}|` +
                               `${update.timeLeft.replace('%3A', ':').replace('%3A', ':')}|` +
                               `${update.questHostClass}|${update.questID}|${update.battleKey}`;
            console.log(JSON.stringify(update));
            this.socketUtils.emitToRoom('u'+update.questID, 'update', miniUpdate);
        });

        // Send status to all connected users every minute
        setInterval(() => {
            this.emitStatus(this.socket);
        }, 1000 * 60);
    }
    
    /**
     * evoked when user connects
     * Sends the status to the currently connected user
     * @param socket socket user
     */
    async handleConnection(socket: Socket) {
        this.usersConnected++;
        this.emitStatus(socket);
        console.log('USER CONNECTED======================================================', this.usersConnected, Object.keys(this.socket?.sockets || {}).length);
    }

    /**
     * evoked when user disconnects
     * @param socket socket user
     */
    handleDisconnect(socket: Socket) {
        this.usersConnected--;
        console.log('USER DISCONNECTED<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', this.usersConnected);
    }

    /**
     * Wrapper function to emit the status
     * @param socket socket user or server to emit the status to
     */
    private emitStatus(socket: Socket | Server) {
        socket.emit(JSON.stringify({active: true}));
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
