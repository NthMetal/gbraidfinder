import { Server, Socket } from 'socket.io';
import * as pako from 'pako';

export class SocketUtils {

    socket: Server;

    constructor(socket: Server) {
        this.socket = socket;
    }

    private getStatus(usersConnected: number) {
        return { active: true, usersConnected }
    }

    public emitStatus(socket: Socket | Server, usersConnected: number) {
        const status = this.getStatus(usersConnected);
        socket.emit('status', Buffer.from(pako.deflate(JSON.stringify(status))));
    }

    public emitToRoom(roomName: string, event: string, message: string) {
        this.socket.in(roomName).emit(event, this.deflate(message));
    }

    private deflate(message: string): Buffer {
        // A stringified Raw Trade: BTCUSD/binance/1624910338/34398/0.7/1/0
        // They will be grouped up and seperated by commas: 
        // BTCUSD/binance/1624910338/34398/0.7/1/0,BTCUSD/binance/1624910338/34398/0.7/1/0,BTCUSD/binance/1624910338/34398/0.7/1/0
        // Then deflated and turned into a buffer
        // level?: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
        // windowBits?: number;
        // memLevel?: number;
        // strategy?: StrategyValues;
        // dictionary?: any;
        // raw?: boolean;
        // to?: 'string';
        // enum StrategyValues {
        //     Z_FILTERED = 1,
        //     Z_HUFFMAN_ONLY = 2,
        //     Z_RLE = 3,
        //     Z_FIXED = 4,
        //     Z_DEFAULT_STRATEGY = 0,
        // }
        // const dictionary = this.exchangeService.getAllProducts().join() + this.exchangeService.getAllExchanges().join();
        // const deflated = pako.deflate(messages.join(','));
        // const deflatedD = pako.deflate(messages.join(','), {
        //     windowBits: 15,
        //     memLevel: 9,
        //     dictionary
        // });
        // console.log(
        //     deflated.length,
        //     deflatedD.length,
        //     'ratio:', deflated.length / deflatedD.length
        // )
        return Buffer.from(pako.deflate(message));
    }
}