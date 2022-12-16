import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from './config.service';
import { StatsService } from './stats.service';


@Controller()
export class AppController {

  constructor(
    private readonly configService: ConfigService,
    private readonly statsService: StatsService
  ) { }

  @Get('/hi')
  getHello(): any {
    return { result: "hi" };
  }

  @Get('/stats')
  async getResults(
    @Query('questId') questId,
    @Query('start') start,
    @Query('end') end,
    @Query('interval') interval,
    @Query('count') count
  ) {
    return await this.statsService.queryInterval(questId, new Date(+start), new Date(+end), interval, count);
  }

}
