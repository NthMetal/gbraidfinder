import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Raid } from 'src/types/raid';
import { Update } from 'src/types/update';
import { GBR } from './gbr';

const accounts = require('../../../secrets/accounts.json');

@Injectable()
export class GbrService implements OnModuleInit {

    private gbrInstances: GBR[] = [];

    private updates: Subject<Update> = new Subject<Update>();

    // private gbrCurrentId = 1;
    // private gbrDetector = new GBR(this.gbrCurrentId);

    constructor() {}

    async onModuleInit() {
        let index = 0;
        console.log('initializing accounts: ', accounts)
        for (const account of accounts) {
            const gbr = new GBR(index, this.updates);
            this.gbrInstances.push(gbr);
            console.log(`Created gbr instance number ${index}`);
            try {
                const initStatus: any = await gbr.getInitStatus();
                await gbr.accountSet(
                    initStatus.data?.account?.username || account.username,
                    initStatus.data?.account?.password || account.password,
                    initStatus.data?.account?.rank || account.rank);
                console.log(initStatus.data, account);
                gbr.handleUpdates();
                if (initStatus.data.initializedBrowser && initStatus.data.initializedLogin) {
                    console.log('gbr already initialized');
                    continue;
                }
                const browserInitStatus = await gbr.initializeBrowser();
                const manualInitStatus = await gbr.initializeManually();
                console.log('set account for:', initStatus.data?.account?.username, account.username, browserInitStatus, manualInitStatus);
            } catch(error) {
                console.log('error setting account:');
                console.log(error);
            }
            index++;
        }
        // setInterval(async () => {
        //     this.gbrDetector.getStatus().then((result: any) => {
        //         if (result.status) {
        //             console.log('succesfully connected to instance, adding another')
        //             this.gbrInstances.push(this.gbrDetector);
        //             this.gbrCurrentId++;
        //             this.gbrDetector = new GBR(this.gbrCurrentId);
        //         }
        //     }).catch(error => {
        //         // console.log('e', error);
        //     });
        // }, 1000);
        // const gbr1 = new GBR(1);
        // console.log(await gbr1.getStatus());
        // console.log(await gbr1.accountSet('account@email.here', 'accountpassword', 5));
        // console.log(await gbr1.getStatus());
        // console.log(await gbr1.initializeBrowser());
    }

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
        const rankFiltered = this.gbrInstances.filter(gbr => gbr.rank >= +requiredRank);
        if (!rankFiltered.length) {
            // console.log('Unable to queue, no account has a high enough rank:', requiredRank)
            return;
        }
        const smallestQueueGB = rankFiltered.reduce((prevGB, currGB) => prevGB.getQueueLength() < currGB.getQueueLength() ? prevGB : currGB);
        if (!smallestQueueGB) {
            // console.log('Unable to queue, something went wrong')
            return;
        }
        await smallestQueueGB.schedule(raid.battleKey)
    }

    public getUpdates(): Subject<Update> {
        return this.updates;
    }

}
