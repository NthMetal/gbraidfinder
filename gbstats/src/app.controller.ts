import { Controller, Get } from '@nestjs/common';
import { ConfigService } from './config.service';


@Controller()
export class AppController {

  constructor(
    private readonly configService: ConfigService
  ) { }

  @Get('/hi')
  getHello(): any {
    return { result: "hi" };
  }

  @Get('/get_raid_metadata')
  async getResults() {
    return this.configService.config.raidmetadata;
  }

}
