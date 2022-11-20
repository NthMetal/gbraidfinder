import { Server, Socket } from 'socket.io';
import * as pako from 'pako';

export class SocketUtils {

    socket: Server;

    constructor(socket: Server) {
        this.socket = socket;
    }

    public emitToRoom(roomName: string, event: string, message: string) {
        this.socket.in(roomName).emit(event, this.deflate(message));
    }

    private deflate(message: string): Buffer {
        return Buffer.from(pako.deflate(message));
    }
}