import puppeteer from 'puppeteer';
import { mergeMap, Subject, of, Subscription } from 'rxjs';
import { Update } from 'src/types/update';

/** Deprecated */
export class Granblue {

    private browser: puppeteer.Browser;
    private page: puppeteer.Page;
    public  initialized = false;

    private readonly username: string = '';
    private readonly password: string = '';
    public  readonly rank: number = 0;

    public queueLength = 0;
    private readonly queueSubject: Subject<string> = new Subject();
    private queueSubjectSubscription: Subscription;

    private readonly updatesSubject: Subject<Update>;
    
    constructor(username: string, password: string, rank: number, updates: Subject<Update>) {
        this.username = username;
        this.password = password;
        this.rank = rank;
        this.updatesSubject = updates;
    }

    public async init() {
        // this.browser = await puppeteer.launch();
        this.browser = await puppeteer.launch({ headless: false });
        this.page = await this.loginToGBF();
        this.handleUpdates();
        this.initialized = true;
    }

    private async loginToGBF(): Promise<puppeteer.Page> {
        const page = await this.browser.newPage();
        await page.setDefaultNavigationTimeout(0);

        console.log('navigating')
        // await page.goto('https://developers.google.com/web/');
        await page.goto('https://game.granbluefantasy.jp/');

        // // Type into search box.
        // await page.type('.devsite-search-field', 'Headless Chrome');

        // // Wait for suggest overlay to appear and click "show all results".
        // const allResultsSelector = '.devsite-suggest-all-results';

        // document.onmousemove = function (e) {var x = e.pageX;var y = e.pageY;e.target.title = "X is " + x + " and Y is " + y;};

        await page.waitForSelector('#start');
        await page.mouse.move(20, 470); // let's assume this is inside the element I want
        await page.mouse.down();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        await page.mouse.up();
        await page.mouse.click(20, 470);

        await page.waitForSelector('.btn-auth-login');
        await page.mouse.move(100, 130); // let's assume this is inside the element I want
        await page.mouse.down();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        await page.mouse.up();
        await page.mouse.click(100, 130);

        // await new Promise((resolve) => setTimeout(resolve, 2000));
        // const pages = await this.browser.pages();
        // const mpage = (pages)[2]
        const pageTarget = page.target();
        const newTarget = await this.browser.waitForTarget(target => target.opener() === pageTarget);
        const mpage = await newTarget.page();

        await mpage.waitForSelector('#subject-id');
        await mpage.type('#subject-id', this.username);
        await mpage.type('#subject-password', this.password);
        // await mpage.type('#subject-id', 'account@email.here');
        // await mpage.type('#subject-password', 'accountpassword');
        // await new Promise((resolve) => setTimeout(resolve, 2000));

        await mpage.waitForSelector('.g-recaptcha.btn-positive.w-max');
        await mpage.mouse.move(400, 250); // let's assume this is inside the element I want
        await mpage.mouse.down();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        await mpage.mouse.up();
        await mpage.mouse.click(400, 250);

        await mpage.waitForSelector('#notify-response-button');
        await mpage.mouse.move(400, 440); // let's assume this is inside the element I want
        await mpage.mouse.down();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        await mpage.mouse.up();
        await mpage.mouse.click(400, 440);

        await page.waitForSelector('.btn-link-quest');
        return page;

        // const raids_page = await this.browser.newPage();
        // await raids_page.goto('https://game.granbluefantasy.jp/#quest/multi/0');

    }

    private async getRaidInfo(battleKey: string) {
        if (!this.initialized) return undefined;
        return await this.page.evaluate(async (battleKey) => {
            const offset = 1000 + (Math.floor(Math.random() * 999));
            const time = (new Date()).getTime();
            const raidPID_fetch: any = await fetch(`https://game.granbluefantasy.jp/quest/battle_key_check?_=${time}&t=${time + offset}&uid=30531769`, {
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
                },
                "referrer": "https://game.granbluefantasy.jp/",
                "referrerPolicy": "strict-origin-when-cross-origin",
                "body": `{\"special_token\":null,\"battle_key\":\"${battleKey}\"}`,
                "method": "POST",
                "mode": "cors",
                "credentials": "include"
            });
            const raidPID_result = await raidPID_fetch.json();
            if (!raidPID_result.redirect) {
                // parse popup
                // raid is either full or finished
                const result = raidPID_result?.popup?.body ?
                                raidPID_result.popup.body === 'This raid battle has already ended.' ? 'ended' :
                                raidPID_result.popup.body === 'This raid battle is full. You can\'t participate.' ? 'full' :
                                'unknown' : 'unknown';
                return {
                    resultStatus: result,
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

            const raidInfo_fetch: any = await fetch(`https://game.granbluefantasy.jp/quest/content/supporter_raid/${raidPID}/3/0?_=${time}&t=${time + offset}&uid=30531769`, {
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
            const shortData = raidInfo_result.data.substring(0, 4500);

            // raidInfo_result.data

            // hp  - prt-raid-gauge-inner%22%20style%3D%22width%3A%2019%25%3B
            //       prt-raid-gauge-inner"     style=  "  width:     19%  ;
            const hp_reg = shortData.match(/prt-raid-gauge-inner%22%20style%3D%22width%3A%20(.{2}|.{3})%25%3B/);
            
            // players - prt-flees-in%22%3E2%2F30%3C
            //           prt-flees-in"  >  2/  30<
            const players_reg = shortData.match(/prt-flees-in%22%3E(.{6})%3C/);

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
                battleKey,
                // test: shortData
            };

            

        }, battleKey);
        


        // { redirect: '#quest/supporter_raid/30467152391/305171/1/3/0/6' }
        // {
        //   popup: {
        //     element_name: 'pop',
        //     title: 'Battle',
        //     body: 'This raid battle has already ended.',
        //     className: null,
        //     okCallBackName: 'popRemove',
        //     cancelCallBackName: null,
        //     exceptionFlag: false,
        //     url: null,
        //     tpl: '%3Cdiv%20class%3D%22pop-usual%20%3C%25%3D%20className%20%25%3E%22%20data-token%3D%22%22%3E%0A%09%3Cdiv%20class%3D%22prt-popup-header%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%3C%25%20if%28Game.lang%20%3D%3D%3D%20%27ja%27%20%26%26%20typeof%20title%20%21%3D%3D%20%27undefined%27%20%26%26%20title%20%26%26%20title.length%20%3E%2022%29%20%7B%20%25%3E%20txt-small%3C%25%20%7D%20%25%3E%22%3E%3C%25%3D%20title%20%25%3E%3C%2Fdiv%3E%0A%09%3Cdiv%20class%3D%22prt-popup-body%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%22%3E%0A%09%09%3Cdiv%20class%3D%22txt-popup-body%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%22%3E%3C%25%3D%20body%20%25%3E%3C%2Fdiv%3E%0A%09%09%3C%25%20if%20%28btnTreasure%20%3D%3D%3D%201%29%20%7B%20%25%3E%0A%09%09%09%3Cdiv%20class%3D%22prt-treasure-registration%22%3E%0A%09%09%09%09%3Cdiv%20class%3D%22txt-treasure-registration%22%3E%7B%25%20%27%E3%81%8A%E6%B0%97%E3%81%AB%E5%85%A5%E3%82%8A%E7%99%BB%E9%8C%B2%E3%81%AF%E3%81%93%E3%82%8C%E4%BB%A5%E4%B8%8A%E3%81%A7%E3%81%8D%E3%81%BE%E3%81%9B%E3%82%93%27%7C_%20%25%7D%3C%2Fdiv%3E%0A%09%09%09%09%3Cdiv%20class%3D%22btn-treasure-registration%22%3E%3C%2Fdiv%3E%0A%09%09%09%3C%2Fdiv%3E%0A%09%09%3C%25%20%7D%20%25%3E%0A%09%3C%2Fdiv%3E%0A%09%3Cdiv%20class%3D%22prt-popup-footer%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%22%3E%0A%09%09%3C%25%20if%28flagBtnCancel%3D%3D1%29%7B%20print%28%22%3Cdiv%20class%3D%27btn-usual-cancel%22%20%2B%20%28btnCancelClassName%20%3F%20%22%20%22%2BbtnCancelClassName%20%3A%20%22%22%29%20%2B%20%28arguments%5B0%5D.btnCancelText%20%3F%20%22%20hide-common-text%22%20%3A%20%22%22%29%20%2B%20%22%27%3E%22%20%2B%20%28arguments%5B0%5D.btnCancelText%20%7C%7C%20%27%27%29%20%2B%20%22%3C%2Fdiv%3E%22%29%20%7D%20%25%3E%0A%09%09%3C%25%20if%28flagBtnClose%3D%3D1%29%7B%20print%28%22%3Cdiv%20class%3D%27btn-usual-close%22%20%2B%20%28btnCloseClassName%20%3F%20%22%20%22%2BbtnCloseClassName%20%3A%20%22%22%29%20%2B%20%28arguments%5B0%5D.btnCloseText%20%3F%20%22%20hide-common-text%22%20%3A%20%22%22%29%20%2B%20%22%27%3E%22%20%2B%20%28arguments%5B0%5D.btnCloseText%20%7C%7C%20%27%27%29%20%2B%20%22%3C%2Fdiv%3E%22%29%20%7D%20%25%3E%0A%09%09%3C%25%20if%28flagBtnOk%3D%3D1%29%7B%20print%28%22%3Cdiv%20class%3D%27btn-usual-ok%22%20%2B%20%28btnOkClassName%20%3F%20%22%20%22%2BbtnOkClassName%20%3A%20%22%22%29%20%2B%20%28arguments%5B0%5D.btnOkText%20%3F%20%22%20hide-common-text%22%20%3A%20%22%22%29%20%20%2B%20%22%27%3E%22%20%2B%20%28arguments%5B0%5D.btnOkText%20%7C%7C%20%27%27%29%20%2B%20%22%3C%2Fdiv%3E%22%29%20%7D%20%25%3E%0A%09%3C%2Fdiv%3E%0A%3C%2Fdiv%3E%0A'
        //   }
        // }
        // {
        //     "popup": {
        //         "element_name":"pop",
        //         "title":"Battle",
        //         "body":"This raid battle is full. You can't participate.",
        //         "className":null,
        //         "okCallBackName":"popRemove",
        //         "cancelCallBackName":null,
        //         "exceptionFlag":false,
        //         "url":null,
        //         "tpl":"%3Cdiv%20class%3D%22pop-usual%20%3C%25%3D%20className%20%25%3E%22%20data-token%3D%22%22%3E%0A%09%3Cdiv%20class%3D%22prt-popup-header%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%3C%25%20if%28Game.lang%20%3D%3D%3D%20%27ja%27%20%26%26%20typeof%20title%20%21%3D%3D%20%27undefined%27%20%26%26%20title%20%26%26%20title.length%20%3E%2022%29%20%7B%20%25%3E%20txt-small%3C%25%20%7D%20%25%3E%22%3E%3C%25%3D%20title%20%25%3E%3C%2Fdiv%3E%0A%09%3Cdiv%20class%3D%22prt-popup-body%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%22%3E%0A%09%09%3Cdiv%20class%3D%22txt-popup-body%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%22%3E%3C%25%3D%20body%20%25%3E%3C%2Fdiv%3E%0A%09%09%3C%25%20if%20%28btnTreasure%20%3D%3D%3D%201%29%20%7B%20%25%3E%0A%09%09%09%3Cdiv%20class%3D%22prt-treasure-registration%22%3E%0A%09%09%09%09%3Cdiv%20class%3D%22txt-treasure-registration%22%3E%7B%25%20%27%E3%81%8A%E6%B0%97%E3%81%AB%E5%85%A5%E3%82%8A%E7%99%BB%E9%8C%B2%E3%81%AF%E3%81%93%E3%82%8C%E4%BB%A5%E4%B8%8A%E3%81%A7%E3%81%8D%E3%81%BE%E3%81%9B%E3%82%93%27%7C_%20%25%7D%3C%2Fdiv%3E%0A%09%09%09%09%3Cdiv%20class%3D%22btn-treasure-registration%22%3E%3C%2Fdiv%3E%0A%09%09%09%3C%2Fdiv%3E%0A%09%09%3C%25%20%7D%20%25%3E%0A%09%3C%2Fdiv%3E%0A%09%3Cdiv%20class%3D%22prt-popup-footer%3C%25%20if%28typeof%20maskSubMenu%20%21%3D%3D%20%27undefined%27%20%26%26%20maskSubMenu%29%7B%20%25%3E-sm%3C%25%20%7D%20%25%3E%22%3E%0A%09%09%3C%25%20if%28flagBtnCancel%3D%3D1%29%7B%20print%28%22%3Cdiv%20class%3D%27btn-usual-cancel%22%20%2B%20%28btnCancelClassName%20%3F%20%22%20%22%2BbtnCancelClassName%20%3A%20%22%22%29%20%2B%20%28arguments%5B0%5D.btnCancelText%20%3F%20%22%20hide-common-text%22%20%3A%20%22%22%29%20%2B%20%22%27%3E%22%20%2B%20%28arguments%5B0%5D.btnCancelText%20%7C%7C%20%27%27%29%20%2B%20%22%3C%2Fdiv%3E%22%29%20%7D%20%25%3E%0A%09%09%3C%25%20if%28flagBtnClose%3D%3D1%29%7B%20print%28%22%3Cdiv%20class%3D%27btn-usual-close%22%20%2B%20%28btnCloseClassName%20%3F%20%22%20%22%2BbtnCloseClassName%20%3A%20%22%22%29%20%2B%20%28arguments%5B0%5D.btnCloseText%20%3F%20%22%20hide-common-text%22%20%3A%20%22%22%29%20%2B%20%22%27%3E%22%20%2B%20%28arguments%5B0%5D.btnCloseText%20%7C%7C%20%27%27%29%20%2B%20%22%3C%2Fdiv%3E%22%29%20%7D%20%25%3E%0A%09%09%3C%25%20if%28flagBtnOk%3D%3D1%29%7B%20print%28%22%3Cdiv%20class%3D%27btn-usual-ok%22%20%2B%20%28btnOkClassName%20%3F%20%22%20%22%2BbtnOkClassName%20%3A%20%22%22%29%20%2B%20%28arguments%5B0%5D.btnOkText%20%3F%20%22%20hide-common-text%22%20%3A%20%22%22%29%20%20%2B%20%22%27%3E%22%20%2B%20%28arguments%5B0%5D.btnOkText%20%7C%7C%20%27%27%29%20%2B%20%22%3C%2Fdiv%3E%22%29%20%7D%20%25%3E%0A%09%3C%2Fdiv%3E%0A%3C%2Fdiv%3E%0A"
        //     }
        // }
        

    }

    private handleUpdates() {
        this.queueSubjectSubscription = this.queueSubject.pipe(mergeMap(async battleKey => {
            const update = await this.getRaidInfo(battleKey);
            this.updatesSubject.next(update);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return battleKey;
        }, 50)).subscribe(battleKey => {
            this.queueLength--;
        });
    }

    private stopHandlingUpdates() {
        this.queueSubjectSubscription.unsubscribe();
    }

    public clearQueue() {
        this.stopHandlingUpdates();
        this.handleUpdates();
    }

    public getQueueLength() {
        return this.queueLength;
    }

    public schedule(battleKey: string, updateSubject: Subject<Update>) {
        this.queueLength++;
        this.queueSubject.next(battleKey);
    }


}