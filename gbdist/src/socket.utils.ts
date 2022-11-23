import { Server, Socket } from 'socket.io';
import * as pako from 'pako';

export class SocketUtils {

    socket: Server;

    constructor(socket: Server) {
        this.socket = socket;
    }

    /**
     * emits a message to the room
     * @param roomName room to emit the message to, usually questId (ex. r300161)
     * @param event event the message is sent to (ex. "raid", "update")
     * @param message message to send, usually minimized string, will be minimized
     */
    public emitToRoom(roomName: string, event: string, message: string) {
        this.socket.in(roomName).emit(event, this.deflate(message));
    }

    /**
     * compresses a string using pako deflate
     * @param message message to deflate
     * @returns deflated buffer
     */
    private deflate(message: string): Buffer {
        return Buffer.from(pako.deflate(message));
    }
}