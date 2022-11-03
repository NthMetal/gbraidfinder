import { Injectable, OnModuleInit } from '@nestjs/common';
import { firstValueFrom, Subject } from 'rxjs';
import { Raid } from 'src/types/raid';
import { RaidMetadata } from 'src/types/raidmetadata';
import { TwitterService } from '../twitter/twitter.service';
import * as raidMetadata from '../../raidmetadata.json';
import * as fs from 'fs';
import { Update } from 'src/types/update';
import { GbrService } from '../gbr/gbr.service';

@Injectable()
export class RaidService implements OnModuleInit {
    private raids: Subject<Raid> = new Subject<Raid>();

    constructor(
        private twitterService: TwitterService,
        private gbrService: GbrService
    ) { }

    async onModuleInit() {
        console.log('GBF Initialized');
        this.twitterService.getTweets().subscribe(async tweet => {
            try {
                const locale = tweet.matching_rules[0].tag;
                const questName = tweet.data.text.split('\n')[2];
                const metadata = raidMetadata.find(meta => meta.tweet_name_en === questName || meta.tweet_name_jp === questName);
                if (!metadata) {
                    console.log(`unable to find metada for ${questName}`);
                    return;
                }
                let msgKeySplit: any = tweet.data.text.match(/(.*) :/g);
                if (msgKeySplit) msgKeySplit = tweet.data.text.match(/(.*) :/g)[0];
                else return;
                const raid: Raid = {
                    twitterUser: {
                        name: tweet.includes.users[0].name,
                        imgUrl: tweet.includes.users[0].profile_image_url,
                        username: tweet.includes.users[0].username,
                        verified: tweet.includes.users[0].verified
                    },
                    created_at: tweet.data.created_at,
                    locale,
                    message: msgKeySplit.slice(0, -10),
                    battleKey: msgKeySplit.slice(-10, -2),
                    quest_id: metadata?.quest_id
                }
                this.raids.next(raid);

                // queue raid for update
                this.gbrService.queueUpdate(raid, metadata.level);
                // if (raid.quest_id === '305171') {
                    
                //     // const updatedRaid = await this.browserService.getRaidInfo(raid.battleKey, metadata.level);
                //     // if (!updatedRaid.hp) console.log('sending: ', updatedRaid);
                //     // this.updates.next(updatedRaid);
                // } else {
                //     const mockraidUpdate: Update = {
                //         resultStatus: 'success',
                //         link: '#quest/supporter_raid/30467231476/305171/1/3/0/6',
                //         hp: '86',
                //         players: '3%2F30',
                //         timeLeft: '01%3A28%3A48',
                //         questHostClass: '410301',
                //         raidPID: '30467231476',
                //         questID: raid.quest_id,
                //         battleKey: raid.battleKey
                //     }
                //     // this.updates.next(mockraidUpdate);
                // }
            } catch (error) {
                console.log(error);
            }
        });

    }

    public getRaids(): Subject<Raid> {
        return this.raids;
    }

    public getUpdates(): Subject<Update> {
        return this.gbrService.getUpdates();
    }
}
