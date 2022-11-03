import { Body, Controller, Get, OnModuleInit, Param, Post, Req, Request } from '@nestjs/common';
// import axios from 'axios';
import { AppService } from './app.service';

const axios = require('axios');

@Controller()
export class AppController {

  constructor(private readonly appService: AppService) { }

  @Post('/:id/account/status')
  accountStatus(@Param('id') id): any {
    console.log('getting account');
    const account = this.appService.getAccount();
    return {
      status: account ? 'set' : 'unset',
      data: account
    };
  }

  @Post('/:id/account/rank')
  accountRank(@Param('id') id): any {
    console.log('getting rank');
    const account = this.appService.getAccount();
    return {
      status: account && account.rank ? 'success' : 'unset',
      data: account.rank
    };
  }

  @Post('/:id/init/status')
  initStatus(@Param('id') id): any {
    console.log('getting status');
    const status = this.appService.getInitStatus();
    return {
      status: 'success',
      data: status
    };
  }

  @Post('/:id/account/set')
  async accountSet(
    @Req() req: Request,
    @Param('id') id,
    @Body() body: {
      username: string,
      password: string,
      rank: number
    }
  ) {
    console.log('setting account', body);
    const { username, password, rank } = body;
    const result = this.appService.setAccount(username, password, rank);
    return {
      status: result
    }
  }


  @Post('/:id/initializeBrowser')
  async initializeBrowser(
    @Req() req: Request,
    @Param('id') id
  ) {
    console.log('initializing browser');
    const result = await this.appService.initalizeBrowser();
    return {
      status: result
    }
  }

  @Post('/:id/initializeLogin')
  async initializeLogin(
    @Req() req: Request,
    @Param('id') id
  ) {
    console.log('initializing login');
    const result = await this.appService.initializeLogin();
    return {
      status: result
    }
  }

  
  @Post('/:id/initializeManually')
  async initializeManually(
    @Req() req: Request,
    @Param('id') id
  ) {
    console.log('initializing manually');
    const result = await this.appService.initializeManually();
    return {
      status: result
    }
  }

  @Post('/:id/getRaidInfo')
  async getRaidInfo(
    @Req() req: Request,
    @Param('id') id,
    @Body() body: {
      battleKey: string
    }
  ) {
    // console.log('getting raid info', body);
    const { battleKey } = body;
    if (!battleKey) return { status: 'no battle key' };
    try {
      const result = await this.appService.getRaidInfo(battleKey);
      return result;
    } catch(error) {
      return { status: 'error' }
    }
  }

}
