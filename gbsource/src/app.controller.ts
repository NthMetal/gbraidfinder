import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { TwitterService } from './twitter/twitter.service';

@Controller()
export class AppController implements OnModuleInit {

  // TODO: add raid type
  private raids: Subject<any> = new Subject<any>();
  private duplicateRaidBuffer: Set<string> = new Set<string>();

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly twitterService: TwitterService,
    private readonly configService: ConfigService
  ) { }

  onModuleInit() {
    this.twitterService.getTweetSources().subscribe(async tweetSource => {
      try {
        const questName = tweetSource.message[0].monster_name;
        const metadata = this.configService.config.raidmetadata.find(meta => meta.tweet_name_en === questName || meta.tweet_name_jp === questName || meta.tweet_name_alt.includes(questName));
        const raid = {
          locale: tweetSource.message[0].eng ? 'EN' : 'JP',
          message: tweetSource.message[0].comment,
          battleKey: tweetSource.message[0].rescue_id,
          quest_id: metadata?.quest_id
        }
        this.processRaid(raid, metadata.level);
      } catch (error) {
        console.log(error);
      }
    });
    this.twitterService.getTweets().subscribe(async tweet => {
      try {
        const locale = tweet.matching_rules[0].tag;
        const questName = tweet.data.text.split('\n')[2];
        const metadata = this.configService.config.raidmetadata.find(meta => meta.tweet_name_en === questName || meta.tweet_name_jp === questName || meta.tweet_name_alt.includes(questName));
        if (!metadata) {
          console.log(`unable to find metada for ${questName}`);
          return;
        }
        let msgKeySplit: any = tweet.data.text.match(/(.*) :/g);
        if (msgKeySplit) msgKeySplit = tweet.data.text.match(/(.*) :/g)[0];
        else return;
        const raid = {
          locale,
          message: msgKeySplit.slice(0, -10),
          battleKey: msgKeySplit.slice(-10, -2),
          quest_id: metadata?.quest_id
        }

        this.processRaid(raid, metadata.level);
      } catch (error) {
        console.log(error);
      }
    });
    // setInterval(() => {
    //   this.kafkaService.sendRaid({raid: 'test'}, 101);
    // }, 200);
  }

  /**
   * Sends the raid to the kafka topic cooresponding to the level
   * Raid codes are added to a buffer and removed from the buffer after 1 minute
   * only sends raids to the topic that don't already have a code in the buffer
   * @param raid raid to process
   * @param level level requirement of the raid
   */
  private processRaid(raid: any, level: string) {
    const id = raid.battleKey;
    const bufferHasId = this.duplicateRaidBuffer.has(id);
    if (bufferHasId) return;
    this.duplicateRaidBuffer.add(id);
    this.kafkaService.sendRaid(raid, +level);
    setTimeout(() => {
      this.duplicateRaidBuffer.delete(id);
    }, 1000 * 60);
  }

  public getRaids(): Subject<any> {
    return this.raids;
  }

}
