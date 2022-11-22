import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { SocketGateway } from './socket.gateway';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ConfigService, KafkaService, SocketGateway],
})
export class AppModule {}
