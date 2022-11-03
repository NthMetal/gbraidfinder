import { Injectable, OnModuleInit } from '@nestjs/common';
import puppeteer from 'puppeteer';
import { CronJob } from 'cron';
import { RaidMetadata } from 'src/types/raidmetadata';
import { BehaviorSubject, Subject } from 'rxjs';
import { Granblue } from './granblue';
import { Update } from 'src/types/update';
import { Raid } from 'src/types/raid';

/** Deprecated */
@Injectable()
export class BrowserService implements OnModuleInit {
    public raidMetadata: BehaviorSubject<RaidMetadata[]> = new BehaviorSubject<RaidMetadata[]>(null);

    private accounts: { username: string, password: string, rank: number }[] = []

    public granblues: Granblue[];

    private updates: Subject<Update> = new Subject<Update>();

    constructor() { }

    // private 

    async onModuleInit() {
        // this.granblues = this.accounts.map(account => new Granblue(account.username, account.password, account.rank, this.updates));
        // await this.getRaidQuestInfo(loggedInPage);
        // const job = new CronJob('59 23 * * 0', async () => {
        //     await this.getRaidQuestInfo(loggedInPage);
        // }, null, true)

        // await page.click('div[id="start"]', {delay: 2000});
        // // Wait for the results page to load and display the results.
        // const resultsSelector = '.gsc-results .gs-title';
        // await page.waitForSelector(resultsSelector);

        // // Extract the results from the page.
        // const links = await page.evaluate(resultsSelector => {
        //   return [...document.querySelectorAll(resultsSelector)].map(anchor => {
        //     const title = anchor.textContent.split('|')[0].trim();
        //     return `${title} - ${anchor['href']}`;
        //   });
        // }, resultsSelector);

        // // Print all the files.
        // console.log(links.join('\n'));

        // await browser.close();
    }
    async init() {
        // sequentially initialize accounts
        // for (const granblue of this.granblues) {
        //     await granblue.init();
        // }
    }

    private async getRaidQuestInfo(page: puppeteer.Page): Promise<puppeteer.Page> {
        // console.log('intercepting')
        // await page.setRequestInterception(true);
        await new Promise((resolve) => setTimeout(resolve, 10000)); // wait 2 secs
        // console.log('PAGE COOKIES', await page.cookies());

        const getRaids = async () => await page.evaluate(async () => {
            const offset = 1000 + (Math.floor(Math.random() * 999));
            const time = (new Date()).getTime();
            const standardType_fetch: any = await fetch(`https://game.granbluefantasy.jp/rest/quest/multi/stage_list/1?_=${time}&t=${time + offset}&uid=37043449`, {
                "headers": {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9",
                    "sec-ch-ua": "\"Chromium\";v=\"107\", \"Not=A?Brand\";v=\"24\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-newrelic-id": "VQYDUlVRARABVFBWDwcBVVMC",
                    "x-requested-with": "XMLHtt pRequest",
                    "x-version": "1665972730",
                    "chrome-experimental": "test"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            })
            const impossibleType_fetch: any = await fetch(`https://game.granbluefantasy.jp/rest/quest/multi/stage_list/2?_=${time}&t=${time + offset}&uid=37043449`, {
                "headers": {
                    "accept": "application/json, text/javascript, */*; q=0.01",
                    "accept-language": "en-US,en;q=0.9",
                    "sec-ch-ua": "\"Chromium\";v=\"107\", \"Not=A?Brand\";v=\"24\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "x-newrelic-id": "VQYDUlVRARABVFBWDwcBVVMC",
                    "x-requested-with": "XMLHtt pRequest",
                    "x-version": "1665972730",
                    "chrome-experimental": "test"
                },
                "body": null,
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });
            const standardType = await standardType_fetch.json() as { is_event: boolean, list: { stage_id: string, difficulty: string, thumbnail_image: string }[] };
            const impossibleType = await impossibleType_fetch.json() as { is_event: boolean, list: { stage_id: string, difficulty: string, thumbnail_image: string }[] };
            const allCategories = [];
            standardType.list.forEach(quest => allCategories.push({ ...quest, impossible: 1 }));
            impossibleType.list.forEach(quest => allCategories.push({ ...quest, impossible: 2 }));
            const allRaids = [];
            for (const category of allCategories) {
                const list = await fetch(`https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/${category.impossible}/${category.difficulty}/${category.stage_id}?_=${time}&t=${time + offset}&uid=37043449`, {
                    "headers": {
                        "accept": "application/json, text/javascript, */*; q=0.01",
                        "accept-language": "en-US,en;q=0.9",
                        "sec-ch-ua": "\"Chromium\";v=\"107\", \"Not=A?Brand\";v=\"24\"",
                        "sec-ch-ua-mobile": "?0",
                        "sec-ch-ua-platform": "\"Windows\"",
                        "sec-fetch-dest": "empty",
                        "sec-fetch-mode": "cors",
                        "sec-fetch-site": "same-origin",
                        "x-newrelic-id": "VQYDUlVRARABVFBWDwcBVVMC",
                        "x-requested-with": "XMLHtt pRequest",
                        "x-version": "1665972730",
                        "chrome-experimental": "test"
                    },
                    "body": null,
                    "method": "GET",
                    "mode": "cors",
                    "credentials": "include"
                }).then(response => response.json()).then(data => data.list)
                allRaids.push(...list.map(raid => ({
                    quest_name: raid.quest_name,
                    quest_id: raid.quest_id,
                    level: raid.level,
                    impossible: category.impossible,
                    difficulty: category.difficulty,
                    stage_id: category.stage_id,
                    thumbnail_image: category.thumbnail_image
                })))
            }

            return allRaids;
        });
        const raids_en = await getRaids();

        // Switch to JP
        // document.onmousemove = function (e) {var x = e.pageX;var y = e.pageY;e.target.title = "X is " + x + " and Y is " + y;};
        // await page.setViewport({
        //     width: 800,
        //     height: 1000
        // });
        // await page.waitForSelector('.btn-head-pop');
        // await page.mouse.move(660, 50); // let's assume this is inside the element I want
        // await page.mouse.down();
        // await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        // await page.mouse.up();
        // await page.mouse.click(660, 50);

        // await page.waitForSelector('.btn-global-setting');
        // await page.mouse.move(460, 780); // let's assume this is inside the element I want
        // await page.mouse.down();
        // await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        // await page.mouse.up();
        // await page.mouse.click(460, 780);

        await page.waitForSelector('.btn-sub-setting');
        await page.mouse.move(630, 140); // let's assume this is inside the element I want
        await page.mouse.down();
        await new Promise((resolve) => setTimeout(resolve, 2000)); // wait 2 secs
        await page.mouse.up();
        await page.mouse.click(630, 140);

        await page.waitForSelector('#language-type-sm');
        console.log('selecting...');
        await page.select('#language-type-sm', '1');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await page.waitForSelector('#language-type-sm');

        const raids_jp = await getRaids();

        await page.select('#language-type-sm', '2');

        const updatedRaids = raids_en.map((raid, index) => {
            const match = raids_jp[index]
            // const match2 = raids_jp.find(raid_jp => raid_jp.quest_id === raid.quest_id)
            return {
                quest_name_en: raid.quest_name,
                quest_name_jp: match.quest_name,
                quest_id: raid.quest_id,
                level: raid.level,
                impossible: raid.impossible,
                difficulty: raid.difficulty,
                stage_id: raid.stage_id,
                thumbnail_image: raid.thumbnail_image
            } as any
        });

        this.raidMetadata.next(updatedRaids);
        // console.log(raids);
        // console.log(raids.length);

        // console.log('reading requests');
        // page.on('request', async request => {
        //     const requestURL = await request.url();
        //     if (requestURL.includes('https://game.granbluefantasy.jp/rest/quest/multi/stage_detail')) console.log(requestURL);
        //     //                                                                                    /2/1/12011
        //     //                       https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/1/11011?_=1666308723176&t=1666308791200&uid=37043449
        //     request.continue();
        // });
        // await page.goto('https://game.granbluefantasy.jp/#quest/multi/0');

        // https://game.granbluefantasy.jp/rest/quest/multi/stage_list/1?_=1666309245837&t=1666309247116&uid=16523292
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_list/2?_=1666309245838&t=1666309287158&uid=16523292

        // {
        //     "is_event": false,
        //     "list": [
        //         {
        //             "stage_id": "11011",
        //             "difficulty": "1",
        //             "thumbnail_image": "normal_hard"
        //         },
        //         {
        //             "stage_id": "11021",
        //             "difficulty": "2",
        //             "thumbnail_image": "normal_magna"
        //         },
        //         {
        //             "stage_id": "11031",
        //             "difficulty": "3",
        //             "thumbnail_image": "normal_primal"
        //         },
        //         {
        //             "stage_id": "11041",
        //             "difficulty": "4",
        //             "thumbnail_image": "normal_proto_bahamut"
        //         },
        //         {
        //             "stage_id": "11051",
        //             "difficulty": "5",
        //             "thumbnail_image": "normal_seraphic"
        //         },
        //         {
        //             "stage_id": "11061",
        //             "difficulty": "6",
        //             "thumbnail_image": "normal_ultimate_bahamut"
        //         }
        //     ]
        // }
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/${impossible}/${difficulty}/${stage_id}?_=1666308913345&t=1666308921561&uid=37043449
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/1/11011?_=1666308913345&t=1666308921561&uid=37043449
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/2/11021?_=1666308913346&t=1666308931757&uid=37043449
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/3/11031?_=1666308913347&t=1666308935026&uid=37043449
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/4/11041?_=1666308913348&t=1666308938687&uid=37043449
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/5/11051?_=1666308913349&t=1666308941628&uid=37043449
        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/1/6/11061?_=1666308913350&t=1666308943560&uid=37043449


        // https://game.granbluefantasy.jp/rest/quest/multi/stage_detail/2/1/12011?_=1666306582621&t=1666309067709&uid=16523292
        return page;
    }

    // public async getRaidInfo(battleKey: string, questLevel: string) {
    //     // return {} as any;
    //     const errorResponse = {
    //         resultStatus: 'granblueError',
    //         link: '',
    //         hp: '',
    //         players: '',
    //         timeLeft: '',
    //         questHostClass: '',
    //         raidPID: '',
    //         questID: '',
    //         battleKey
    //     };
    //     const rankFiltered = this.granblues.filter(granblue => granblue.rank >= +questLevel);
    //     if (!rankFiltered.length) return errorResponse;
    //     const smallestQueue = rankFiltered.find(granblue => !granblue.busy );
    //     return await this.granblue.getRaidInfo(battleKey);
    // }

    public async queueUpdate(raid: Raid, requiredRank: string): Promise<void> {
        const errorResponse = {
            resultStatus: 'granblueError',
            link: '',
            hp: '',
            players: '',
            timeLeft: '',
            questHostClass: '',
            raidPID: '',
            questID: raid.quest_id,
            battleKey: raid.battleKey
        };
        const rankFiltered = this.granblues.filter(granblue => granblue.rank >= +requiredRank);
        if (!rankFiltered.length) {
            console.log('Unable to queue, no account has a high enough rank:', requiredRank)
            return;
        }
        const smallestQueueGB = rankFiltered.reduce((prevGB, currGB) => prevGB.getQueueLength() < currGB.getQueueLength() ? prevGB : currGB);
        if (!smallestQueueGB) {
            console.log('Unable to queue, something went wrong')
            return;
        }
        await smallestQueueGB.schedule(raid.battleKey, this.updates)
    }

    public getUpdates(): Subject<Update> {
        return this.updates;
    }
}
