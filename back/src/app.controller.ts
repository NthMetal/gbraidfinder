import { Body, Controller, Get, OnModuleInit, Post, Req, Request } from '@nestjs/common';
// import axios from 'axios';
import { AppService } from './app.service';
import * as raidMetadata from './raidmetadata.json';

const axios = require('axios');

@Controller()
export class AppController {

  constructor(private readonly appService: AppService) { }

  @Get('/hi')
  getHello(): any {
    return { result: "hi" };
  }

  @Get('/get_raid_metadata')
  async getResults() {
    return raidMetadata;
  }

}
