import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { StatsService } from './stats.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [ConfigService, KafkaService, StatsService],
})
export class AppModule {}
