import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Raid } from 'src/types/raid';
import { Update } from 'src/types/update';
import { GBR } from './gbr';

@Injectable()
export class GbrService implements OnModuleInit {

    private gbrInstances: GBR[] = [];

    private updates: Subject<Update> = new Subject<Update>();

    // private gbrCurrentId = 1;
    // private gbrDetector = new GBR(this.gbrCurrentId);

    constructor() {}

    async onModuleInit() {
        const numberOfAccounts = (+process.env.GBR_INSTANCE_COUNT || 1);
        console.log(`Initializing ${numberOfAccounts} accounts`)
        for(let i=0; i < numberOfAccounts; i++) {
            const gbr = new GBR(i, this.updates);
            this.gbrInstances.push(gbr);
        }
        console.log('Finished Initializing');
        console.log(this.gbrInstances.map(gbr => `${gbr.instanceId}:${gbr.rank}`));
    }

    public async queueUpdate(raid: Raid, requiredRank: string): Promise<void> {
        const rankFiltered = this.gbrInstances.filter(gbr => gbr.rank >= +requiredRank);
        if (!rankFiltered.length) {
            // console.log('Unable to queue, no account has a high enough rank:', requiredRank)
            return;
        }
        // Get GB instance with smallest queue, otherwise get one with smallest rank
        const smallestQueueGB = rankFiltered.reduce((prevGB, currGB) => {
            if (prevGB.getQueueLength() === currGB.getQueueLength()) return prevGB.rank < currGB.rank ? prevGB : currGB
            else return prevGB.getQueueLength() < currGB.getQueueLength() ? prevGB : currGB
        });
        if (!smallestQueueGB) {
            // console.log('Unable to queue, something went wrong')
            return;
        }
        await smallestQueueGB.schedule(raid.battleKey)
    }

    public getUpdates(): Subject<Update> {
        return this.updates;
    }

    public getStatuses() {
        return this.gbrInstances.map(gbr => gbr.lastUpdateProcessedAt);
    }

}
