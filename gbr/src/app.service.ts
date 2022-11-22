import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';

@Injectable()
export class AppService {

  private account: { username: string, password: string, rank: number } = undefined;

  private initializedBrowser = false;
  private loggedIn = false;
  private browser: puppeteer.Browser;
  private page: puppeteer.Page;

  constructor() {
    this.account = {
      username: process.env.GBR_ACCOUNT_USERNAME,
      password: process.env.GBR_ACCOUNT_PASSWORD,
      rank: +process.env.GBR_ACCOUNT_RANK,
    }
    console.log('Initialized Account', this.account);
    this.initializeBrowser().then(result => {
      if (result === 'success') this.loginToGBF();
    });
  }

  /**
   * Gets the currently set account info
   * @returns the currently set account info
   */
  public getAccount() {
    return this.account;
  };

  /**
   * Returns the various statuses of the microservice
   */
  public getInitStatus() {
    return {
      initializedBrowser: this.initializedBrowser,
      account: this.account
    }
  }

  /**
   * Starts the puppeteer browser
   */
  private async initializeBrowser() {
    console.log('Initializing Browser', this.initializedBrowser, this.account);
    if (this.initializedBrowser) return 'already initialized';
    if (!this.account) return 'no account';
    try {
      // remote debugging must be available for manual initialization
      const launchOptions = process.env.NODE_ENV === 'dev' ? { headless: false } : { args: ['--no-sandbox', '--disable-setuid-sandbox', '--remote-debugging-address=0.0.0.0', '--remote-debugging-port=9222'] }
      this.browser = await puppeteer.launch(launchOptions);
      this.page = (await this.browser.pages())[0];
      this.browser.on('disconnected', () => {
        throw new Error('Browser Disconnected');
      })
    } catch (error) {
      console.log('Initializing browser error', error);
      return 'error';
    }
    // try {
    //   // go to this page so you can see the account you need to log in to so manual initialization is easier
    //   await this.page.goto(`http://localhost/${process.env.HOSTNAME}/${this.account.username}/${this.account.password}/${this.account.rank}`);
    // } catch (error) {}
    this.initializedBrowser = true;
    console.log('Initialized Browser');
    return 'success';
  }

  /**
   * Uses puppeteer to log in to gbf
   * Does not fill out captchas and will wait forever
   * @returns logged in puppeteer page promise
   */
  private async loginToGBF(): Promise<void> {
    await this.page.setDefaultNavigationTimeout(0);

    console.log('navigating')
    // await page.goto('https://developers.google.com/web/');
    await this.page.goto('https://game.granbluefantasy.jp/');

    // // Type into search box.
    // await page.type('.devsite-search-field', 'Headless Chrome');

    // // Wait for suggest overlay to appear and click "show all results".
    // const allResultsSelector = '.devsite-suggest-all-results';

    // document.onmousemove = function (e) {var x = e.pageX;var y = e.pageY;e.target.title = "X is " + x + " and Y is " + y;};

    // Click login button on gbf
    await this.page.waitForSelector('#start', { timeout: 0 });
    await this.page.mouse.move(20, 470); // let's assume this is inside the element I want
    await this.page.mouse.down();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
    await this.page.mouse.up();
    await this.page.mouse.click(20, 470);

    // Click mobage option button
    await this.page.waitForSelector('.btn-auth-login', { timeout: 0 });
    await this.page.mouse.move(100, 130); // let's assume this is inside the element I want
    await this.page.mouse.down();
    await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
    await this.page.mouse.up();
    await this.page.mouse.click(100, 130);

    
    const pageTarget = this.page.target();
    const newTarget = await this.browser.waitForTarget(target => target.opener() === pageTarget);
    const mpage = await newTarget.page();

    await mpage.waitForSelector('#subject-id', { timeout: 0 });
    await mpage.type('#subject-id', this.account.username || '');
    await mpage.type('#subject-password', this.account.password || '');
    // await mpage.type('#subject-id', 'account@email.here');
    // await mpage.type('#subject-password', 'accountpassword');
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    // everything ahead is commented out to stop it from logging in further
    // because dealing with the captcha part is tricky so it's done manually for now

    // // Click the login button
    // await mpage.waitForSelector('.g-recaptcha.btn-positive.w-max');
    // await mpage.mouse.move(400, 250); // let's assume this is inside the element I want
    // await mpage.mouse.down();
    // await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
    // await mpage.mouse.up();
    // await mpage.mouse.click(400, 250);

    // // captcha usually happens here

    // // click the ok button after success
    // await mpage.waitForSelector('#notify-response-button', { timeout: 0 });
    // await mpage.mouse.move(400, 440); // let's assume this is inside the element I want
    // await mpage.mouse.down();
    // await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
    // await mpage.mouse.up();
    // await mpage.mouse.click(400, 440);

    // await page.waitForSelector('.btn-link-quest');
    // return page;

    // const raids_page = await this.browser.newPage();
    // await raids_page.goto('https://game.granbluefantasy.jp/#quest/multi/0');

  }

  /**
   * gets a raids hp, players, link, and class for a raid given the battle key
   * @param battleKey 8 Character battle key
   * @returns 
   */
  public async getRaidInfo(battleKey: string) {
    if (!this.account) return { status: 'no account'};
    if (!this.initializedBrowser) return { status: 'browser not initialized' };
    if (this.loggedIn || this.page.url() === 'https://game.granbluefantasy.jp/#mypage') {
      this.loggedIn = true;
    } else return { status: 'not logged in' }

    const raidInfoResult = await this.evaluateBattleKey(battleKey);

    if (raidInfoResult.resultStatus === 'relaod') {
      console.log('reloading page');
      await this.page.reload();
      const raidInfoResult = await this.evaluateBattleKey(battleKey);
      return {
        status: 'success',
        data: raidInfoResult
      }
    }

    return {
      status: 'success',
      data: raidInfoResult
    }
  }

  private async evaluateBattleKey(battleKey: string) {
    return await this.page.evaluate(async (battleKey) => {
      const offset = 1000 + (Math.floor(Math.random() * 999));
      const time = (new Date()).getTime();
      
      // NOTE: the uid is of a rank 5 throwaway account incase they track that to ban users
      const raidPID_fetch = await fetch(`https://game.granbluefantasy.jp/quest/battle_key_check?_=${time}&t=${time + offset}&uid=37043449`, {
        "headers": {
          "accept": "application/json, text/javascript, */*; q=0.01",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json",
          "sec-ch-ua": "\"Chromium\";v=\"107\", \"Not=A?Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          "x-version": window['Game'].version
          // "x-version": '' + 1668656000
        },
        "referrer": "https://game.granbluefantasy.jp/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": `{\"special_token\":null,\"battle_key\":\"${battleKey}\"}`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
      });

      if (raidPID_fetch.status === 409) {
        return {
          resultStatus: 'relaod',
          link: '',
          hp: '',
          players: '',
          timeLeft: '',
          questHostClass: '',
          raidPID: '',
          questID: '',
          battleKey
        }
      }

      const raidPID_result = await raidPID_fetch.json();
      if (!raidPID_result.redirect) {
        // parse popup
        // raid is either full or finished
        const result = raidPID_result?.popup?.body ?
          raidPID_result.popup.body === 'This raid battle has already ended.' ? 'ended' :
            raidPID_result.popup.body === 'This raid battle is full. You can\'t participate.' ? 'full' :
              'unknown' : 'unknown';
        return {
          resultStatus: result + '-' + raidPID_fetch.status,
          link: '',
          hp: '',
          players: '',
          timeLeft: '',
          questHostClass: '',
          raidPID: '',
          questID: '',
          battleKey
        }
      }
      const splitraidPID = raidPID_result.redirect.split('/');
      const raidPID = splitraidPID[2]
      const questID = splitraidPID[3]

      const raidInfo_fetch: any = await fetch(`https://game.granbluefantasy.jp/quest/content/supporter_raid/${raidPID}/3/0?_=${time}&t=${time + offset}&uid=37043449`, {
        "headers": {
          "accept": "application/json, text/javascript, */*; q=0.01",
          "accept-language": "en-US,en;q=0.9",
          "sec-ch-ua": "\"Chromium\";v=\"107\", \"Not=A?Brand\";v=\"24\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest",
          "x-version": window['Game'].version
        },
        "referrer": "https://game.granbluefantasy.jp/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
      });
      const raidInfo_result = await raidInfo_fetch.json();

      if (!raidInfo_result.data) {
        // some error happened
        return {
          resultStatus: 'dataerror',
          link: '',
          hp: '',
          players: '',
          timeLeft: '',
          questHostClass: '',
          raidPID,
          questID,
          battleKey
        }
      }
      // NOTE: raidInfo_result is a large url encoded string containing the html of the summon select page.
      // decoding the entire thing and doing regex operations on the entire thing is too much since most of it is the summon list
      const shortData = raidInfo_result.data.substring(0, 4500);

      // raidInfo_result.data

      // hp  - prt-raid-gauge-inner%22%20style%3D%22width%3A%2019%25%3B
      //       prt-raid-gauge-inner"     style=  "  width:     19%  ;
      const hp_reg = shortData.match(/prt-raid-gauge-inner%22%20style%3D%22width%3A%20(.{1}|.{2}|.{3})%25%3B/);

      // players - prt-flees-in%22%3E2%2F30%3C
      //           prt-flees-in"  >  2/  30<                  1/6  1/18  10/30
      const players_reg = shortData.match(/prt-flees-in%22%3E(.{5}|.{6}|.{7})%3C/);

      // time left - prt-remaining-time%22%3E01%3A15%3A51%3C
      //             prt-remaining-time"  >  01:  15:  51<
      const timeLeft_reg = shortData.match(/prt-remaining-time%22%3E(.{12})%3C/);

      // quest host class - icon%2Fjob%2F100401.png
      //                    icon/  job/  100401.png
      const questHostClass_reg = shortData.match(/icon%2Fjob%2F(.{6})\.png/);


      return {
        resultStatus: 'success',
        link: raidPID_result.redirect,
        hp: hp_reg ? hp_reg[1] : '',
        players: players_reg ? players_reg[1] : '',
        timeLeft: timeLeft_reg ? timeLeft_reg[1] : '',
        questHostClass: questHostClass_reg ? questHostClass_reg[1] : '',
        raidPID,
        questID,
        battleKey
      };



    }, battleKey);
  }

}
