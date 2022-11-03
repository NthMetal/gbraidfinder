import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BrowserService } from './services/browser/browser.service';
import { TwitterService } from './services/twitter/twitter.service';
import { SocketGateway } from './socket.gateway';
import { RaidService } from './services/raid/raid.service';
import { GbrService } from './services/gbr/gbr.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, SocketGateway, RaidService, TwitterService, GbrService, BrowserService],
})
export class AppModule {}
