import * as http from 'http';
import { mergeMap, Subject, Subscription } from 'rxjs';
import { Update } from 'src/types/update';

export class GBR {

    instanceId: number = 0;

    private username: string = '';
    private password: string = '';
    public rank: number = 0;

    public queueLength = 0;
    private readonly queueSubject: Subject<string> = new Subject();
    private queueSubjectSubscription: Subscription;

    private readonly updatesSubject: Subject<Update>;

    constructor(instanceId: number, updates: Subject<Update>) {
        this.instanceId = instanceId;
        this.updatesSubject = updates;
    }

    private post(path: string, data: any) {
        return new Promise((resolve, reject) => {

            const stringifiedData = JSON.stringify(data);
            const hostname = process.env.NODE_ENV === 'dev' ? 'localhost' : 'gbr-service-' + this.instanceId;

            const options = {
                protocol: 'http:',
                hostname,
                // hostname: 'localhost',
                port: 3001,
                // port: 3001 + this.instanceId,
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

    public getStatus() {
        return this.post('/1/account/status', {});
    }

    public getInitStatus() {
        return this.post('/1/init/status', {});
    }

    public accountRank(): any {
        return this.post('/1/account/rank', {});
    }

    public accountSet(username: string, password: string, rank: number) {
        this.username = username;
        this.password = password;
        this.rank = rank;
        const accountSetResult = this.post('/1/account/set', { username, password, rank });
        return accountSetResult;
    }

    public initializeBrowser() {
        return this.post('/1/initializeBrowser', {});
    }

    public initializeLogin() {
        return this.post('/1/initializeLogin', {});
    }

    public initializeManually() {
        return this.post('/1/initializeManually', {});
    }

    public getRaidInfo(battleKey: string) {
        return this.post('/1/getRaidInfo', { battleKey });
    }

    public handleUpdates() {
        this.queueSubjectSubscription = this.queueSubject.pipe(mergeMap(async battleKey => {
            console.log('getting raid info for', battleKey);
            const updateResult: any = await this.getRaidInfo(battleKey);
            if (updateResult.status === 'success') {
                const update = updateResult.data;
                this.updatesSubject.next(update);
            }
            // Why is there a 2s delay here? I don't remember, I just remember it breaking without it.
            // await new Promise((resolve) => setTimeout(resolve, 1000));
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

    public schedule(battleKey: string) {
        // console.log('queueing', battleKey);
        this.queueLength++;
        this.queueSubject.next(battleKey);
    }


}
