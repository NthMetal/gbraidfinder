import { Body, Controller, Param, Post, Req, Request } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {

  constructor(private readonly appService: AppService) { }

  /**
   * Returns the account rank
   * @returns the rank
   */
  @Post('/account/rank')
  accountRank(): any {
    console.log('getting rank');
    const account = this.appService.getAccount();
    return {
      status: account && account.rank ? 'success' : 'unset',
      data: account.rank
    };
  }

  /**
   * Given a battle key, will communicate with chrome using puppetteer to get
   * updated info about the cooresponding raid
   * @param body 
   * @returns 
   */
  @Post('/getRaidInfo')
  async getRaidInfo(
    @Body() body: {
      battleKey: string
    }
  ) {
    const { battleKey } = body;
    if (!battleKey) return { status: 'no battle key' };
    try {
      const result = await this.appService.getRaidInfo(battleKey);
      return result;
    } catch(error) {
      console.log(error);
      return { status: 'error' }
    }
  }

}
