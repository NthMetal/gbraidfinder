import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Twitter, Tweet } from './twitter';

const twittertokens: string[] = require('../../../secrets/twittertokens.json');

@Injectable()
export class TwitterService implements OnModuleInit {
    private token = twittertokens[0];
    
    private twitter: Twitter = undefined;

    private tweets: Subject<Tweet> = new Subject();

    // private raidCounter = 0;
    // private timeElapsed = 0;

    async onModuleInit() {
        /**
         * Create twitter object
         * so that when 2m tweets/month is hit it can use a different object
         */
        this.twitter = new Twitter(this.token, tweet => {
            if (tweet.data.source === 'グランブルー ファンタジー') {
                // console.log(JSON.stringify(tweet));
                this.tweets.next(tweet);
                // this.raidCounter ++;
            }
        });

        // setInterval(() => {
        //     this.timeElapsed+=10;
        //     console.log(`${this.timeElapsed} seconds with raids: ${this.raidCounter}`)
        // }, 10000);
    }

    public getTweets(): Subject<Tweet> {
        return this.tweets;
    }

}
