
import { Subject } from 'rxjs';
import { ConfigService } from 'src/config.service';
import { WebSocket } from 'ws';

interface Rule {
    id: string,
    value: string,
    tag: string
}

export interface Tweet {
    data: {
        attachments: { media_keys: string[] },
        author_id: string,
        edit_history_tweet_ids: string[],
        id: string,
        text: string,
        source: string,
        created_at: string
    },
    includes: { 
        media: {
            media_key: string,
            type: string,
            url: string
        }[],
        users: {
            id: string,
            name: string,
            profile_image_url: string,
            username: string,
            verified: boolean
        }[] },
    matching_rules: { id: string, tag: 'EN' | 'JP' }[]
}

export class TwitterSource {
    private readonly sourceUrl: string;

    raidCounter = 0;
    reconnectionInterval = 1000;
    reconnectionAttempts = 0;
    maxReconnectionAttempts = 10;
    private tweetSource: Subject<any> = new Subject();
    private errors: Subject<string> = new Subject();
    private initialized: Subject<boolean> = new Subject();

    subscribedRaids = [];

    createSubscription: (raid, index) => string

    constructor(
        sourceUrl: string,
        private readonly configService: ConfigService,
        createSubscription: (raid, index) => string
    ) {
        this.sourceUrl = sourceUrl;
        this.connect();
        this.createSubscription = createSubscription || (() => undefined)
    }

    private connect() {
        const wss = new WebSocket(this.sourceUrl);
        wss.on('open', open => {
            this.reconnectionAttempts = 0;
            this.subscribedRaids = [];
            console.log('Connecting twitter source')
            // const testmeta = [{ "element": "dark", "tweet_name_en": "Lvl 150 Proto Bahamut", "tweet_name_jp": "Lv150 プロトバハムート", "quest_name_en": "Wings of Terror (Impossible)","quest_name_jp": "邂逅、黒銀の翼ＨＬ","quest_id": "301061","level": "101","impossible": 2,"difficulty": "6","stage_id": "12061","thumbnail_image": "high_proto_bahamut" }]
            // console.log('actual: ', this.configService.config.raidmetadata.length, 'real: ', testmeta);
            this.configService.config.raidmetadata.forEach((raid, index) => {
                const _this = this;
                setTimeout(() => {
                    wss.send(_this.createSubscription(raid, index))
                    this.subscribedRaids.push(raid.quest_id);
                }, index * 250);
            });
        });
        wss.on('message', data => {
            const message = JSON.parse(data.toString());
            if (message.type === 'confirm_subscription') console.log('Subscribed to', this.subscribedRaids.length, 'out of', this.configService.config.raidmetadata.length);
            if (!message.type) {
                this.tweetSource.next(message);
            };
        });
        wss.on('error', error => {
            console.log('twitter source error');
            this.reconnect();
        });
        wss.on('unexpected-response', error => {
            console.log('twitter source unexpected-response');
            this.reconnect();
        });
        wss.on('close', error => {
            console.log('twitter source close');
            this.reconnect();
        });

        /**
         * When the config is first loaded, or updated
         * Check if all the topics exist, add a new one if it doesn't
         */
        this.configService.configBehaviorSubject.subscribe(async config => {
            console.log('config updated');
            config.raidmetadata.forEach((metadata, index) => {
                if (!this.subscribedRaids.includes(metadata.quest_id)) {
                    wss.send(this.createSubscription(metadata, this.subscribedRaids.length + index))
                }
            });
        });
    }

    private reconnect() {
        this.reconnectionAttempts++;
        if (this.reconnectionAttempts > this.maxReconnectionAttempts) return this.unableToConnect()
        setTimeout(() => { this.connect() }, this.reconnectionInterval);
    }

    private unableToConnect() {
        this.errors.next('unable-to-connect')
    }

    public getTweets() {
        return this.tweetSource;
    }

    public getErrors() {
        return this.errors;
    }

    public isInitialized(): Promise<boolean> {
        return new Promise(resolve => {
            this.initialized.subscribe(initialized => {
                if (initialized) return resolve(true);
            });
        });
    }

}