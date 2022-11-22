import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AppService, ConfigService, KafkaService],
})
export class AppModule {}
