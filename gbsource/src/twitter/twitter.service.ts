import { Injectable, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ConfigService } from 'src/config.service';
import { Twitter, Tweet } from './twitter';
import { TwitterSource } from './twitterSource';


@Injectable()
export class TwitterService implements OnModuleInit {
    // TODO: handle this secret better
    private tokens: string[];
    // private token = twittertokens[0];
    
    private twitter: Twitter = undefined;

    private tweets: Subject<Tweet> = new Subject();
    private tweetSources: Subject<any> = new Subject();

    // private raidCounter = 0;
    // private timeElapsed = 0;
    tweetStatus = {
        lastTweetRecievedAt: undefined,
        lastTweetSourceRecievedAt: undefined
    }

    constructor(
        private readonly configService: ConfigService
    ) {
        this.tokens = this.configService.config.twittertokens
    }


    async onModuleInit() {
        /**
         * Connect to another twitter source
         */
        const twitterSource = new TwitterSource('wss://gbf-twitter-anycable.herokuapp.com/cable', this.configService, (raid, index) => {
            const subscribe = {
                "command": "subscribe",
                "identifier": `{\"channel\":\"RescueChannel\",\"monster_name\":\"${raid.tweet_name_jp}\",\"column_id\":\"${index}\"}`
              };
              return JSON.stringify(subscribe);
        });
        twitterSource.getTweets().subscribe(tweetSource => {
            this.tweetSources.next(tweetSource);
            this.tweetStatus.lastTweetSourceRecievedAt = new Date();
        });

        // const twitterSource2 = new TwitterSource('wss://gbf-raidfinder-tw.herokuapp.com/ws/raids?keepAlive=true', this.configService, (raid, index) => {;
        //       return `1a140a12${raid.quest_name_jp}`;
        // });
        // twitterSource.getTweets().subscribe(tweetSource => {
        //     this.tweetSources.next(tweetSource);
        //     this.tweetStatus.lastTweetSourceRecievedAt = new Date();
        // });
        /**
         * Connect directly to twitter
         * Create twitter object
         * so that when 2m tweets/month is hit it can use a different object
         */
        // this.twitter = new Twitter(this.tokens[0], tweet => {
        //     if (tweet.data.source === 'グランブルー ファンタジー') {
        //         // console.log(JSON.stringify(tweet));
        //         this.tweets.next(tweet);
        //         // this.raidCounter ++;
        //         this.tweetStatus.lastTweetRecievedAt = new Date();
        //     }
        // });

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

    public getStatuses() {
        return this.tweetStatus;
    }

}
