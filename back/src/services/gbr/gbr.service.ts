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
                // TODO: Remove this and set account information with k8s
                gbr.accountSet(account.username, account.password, account.rank);
                console.log(initStatus.data, account);
                if (initStatus.data.initializedBrowser && initStatus.data.initializedLogin) {
                    console.log('gbr already initialized');
                    index++;
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
    }

    public async queueUpdate(raid: Raid, requiredRank: string): Promise<void> {
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
