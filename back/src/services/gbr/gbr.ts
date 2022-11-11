import * as http from 'http';
import { mergeMap, Subject, Subscription } from 'rxjs';
import { Update } from 'src/types/update';

export class GBR {

    instanceId: number = 0;

    public rank: number = 0;

    public queueLength = 0;
    private readonly queueSubject: Subject<string> = new Subject();
    private queueSubjectSubscription: Subscription;

    private readonly updatesSubject: Subject<Update>;

    public lastUpdateProcessedAt;

    constructor(instanceId: number, updates: Subject<Update>) {
        this.instanceId = instanceId;
        this.updatesSubject = updates;
        this.accountRank().then(result => {
            console.log(`${result.status} Rank ${result.data} for instance number ${this.instanceId}`)
            if (result.status === 'success') {
                this.rank = result.data;
                this.handleUpdates();
            }
        });
    }

    private post(path: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {

            const stringifiedData = JSON.stringify(data);
            const hostname = process.env.NODE_ENV === 'dev' ? 'localhost' : 'gbr-service-' + this.instanceId;
            const port = process.env.NODE_ENV === 'dev' ? 3001 + this.instanceId : 3001;

            const options = {
                protocol: 'http:',
                hostname,
                port,
                path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': stringifiedData.length
                }
            }

            const req = http.request(options, res => {
                let data = ''

                res.on('data', chunk => data += chunk)

                res.on('end', () => resolve(JSON.parse(data)))
            }).on('error', err => reject(err))

            req.write(stringifiedData)
            req.end()
        });
    }

    public accountRank(): Promise<{
        status: 'success' | 'unset',
        data: number
    }> {
        return this.post('/account/rank', {});
    }

    public getRaidInfo(battleKey: string): Promise<{
        status: 'success' | 'error',
        data: {
            resultStatus: string,
            link: string,
            hp: string,
            players: string,
            timeLeft: string,
            questHostClass: string,
            raidPID: string,
            questID: string,
            battleKey: string
        }
    }> {
        return this.post('/getRaidInfo', { battleKey });
    }

    private handleUpdates() {
        this.queueSubjectSubscription = this.queueSubject.pipe(mergeMap(async battleKey => {
            console.log('getting raid info for ', battleKey);
            const updateResult: any = await this.getRaidInfo(battleKey);
            this.lastUpdateProcessedAt = new Date();
            if (updateResult.status === 'success') {
                const update = updateResult.data;
                this.updatesSubject.next(update);
            }
            // wait 2 seconds before removing it from the queue
            // so if another request comes within that time it'll go to another account
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return battleKey;
        }, 10)).subscribe(battleKey => {
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

    public schedule(battleKey: string) {
        this.queueLength++;
        this.queueSubject.next(battleKey);
    }


}
