import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';


@Controller()
export class AppController {

  constructor(
    private readonly configService: ConfigService,
    private readonly kafkaService: KafkaService
  ) { }

  @Get('/hi')
  getHello(): any {
    return { result: "hi" };
  }

  @Get('/get_raid_metadata')
  async getResults() {
    return this.configService.config.raidmetadata;
  }
  
  @Get('/r/:battleKey')
  async sendRaid(
    @Param('battleKey') battleKey: string,
    @Query('hp') hp,
    @Query('players') players,
    @Query('class') playerClass,
    @Query('time') time
  ) {
    return { info: 'not yet implemented'};
  }

  @Post('/r/:battleKey')
  async postRaid(@Param('battleKey') battleKey: string) {
    this.kafkaService.sendRaid({
      locale: 'EN',
      message: '',
      battleKey: battleKey,
      quest_id: 'unknown'
    });
    return { info: 'sent' }
  }

}
