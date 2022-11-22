import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { TwitterService } from './twitter/twitter.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [ConfigService, KafkaService, TwitterService],
})
export class AppModule {}
