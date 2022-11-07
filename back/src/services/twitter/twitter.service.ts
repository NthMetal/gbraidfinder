import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { Twitter, Tweet } from './twitter';
import { TwitterSource } from './twitterSource';

const twittertokens: string[] = require('../../../secrets/twittertokens.json');

@Injectable()
export class TwitterService implements OnModuleInit {
    private token = twittertokens[0];
    
    private twitter: Twitter = undefined;

    private tweets: Subject<Tweet> = new Subject();
    private tweetSources: Subject<any> = new Subject();

    // private raidCounter = 0;
    // private timeElapsed = 0;

    async onModuleInit() {
        /**
         * Connect to another twitter source
         */
        const twitterSource = new TwitterSource('wss://gbf-twitter-anycable.herokuapp.com/cable');
        twitterSource.getTweets().subscribe(tweetSource => {
            this.tweetSources.next(tweetSource);
        });
        /**
         * Connect directly to twitter
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

    public getTweetSources(): Subject<any> {
        return this.tweetSources;
    }

}
