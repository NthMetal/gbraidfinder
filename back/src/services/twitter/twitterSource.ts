
import axios from 'axios';
import { Subject } from 'rxjs';
import { WebSocket } from 'ws';
import * as raidMetadata from 'src/raidmetadata.json';

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

    subscribedRaidCount = 0;

    constructor(sourceUrl: string) {
        this.sourceUrl = sourceUrl;
        this.connect();
    }

    private connect() {
        const wss = new WebSocket(this.sourceUrl);
        wss.on('open', open => {
            this.reconnectionAttempts = 0;
            // const testmeta = [{ "element": "dark", "tweet_name_en": "Lvl 150 Proto Bahamut", "tweet_name_jp": "Lv150 プロトバハムート", "quest_name_en": "Wings of Terror (Impossible)","quest_name_jp": "邂逅、黒銀の翼ＨＬ","quest_id": "301061","level": "101","impossible": 2,"difficulty": "6","stage_id": "12061","thumbnail_image": "high_proto_bahamut" }]
            // TODO: Abstract this part
            raidMetadata.forEach((raid, index) => {
                setTimeout(() => {
                    const subscribe = {
                      "command": "subscribe",
                      "identifier": `{\"channel\":\"RescueChannel\",\"monster_name\":\"${raid.tweet_name_jp}\",\"column_id\":\"${index}\"}`
                    };
                    wss.send(JSON.stringify(subscribe));
                }, index * 500);
            });
        });
        wss.on('message', data => {
            const message = JSON.parse(data.toString());
            if (message.type === 'confirm_subscription') console.log('Subscribed to', ++this.subscribedRaidCount, 'out of', raidMetadata.length);
            if (!message.type) {
                this.tweetSource.next(message);
            };
        });
        wss.on('error', error => {
            this.reconnect();
        });
        wss.on('unexpected-response', error => {
            this.reconnect();
        });
        wss.on('close', error => {
            this.reconnect();
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