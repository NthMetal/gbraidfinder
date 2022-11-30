import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
// import * as Datastore from 'nedb';
const Datastore = require('nedb');

@Injectable()
export class StatsService implements OnModuleInit {
    currentRaidTimeHistory: { [questId: string]: number } = {};
    currentRaidHP: { [hpPercent: number]: number } = {}
    currentRaidPlayers: { [playerPercent: string]: number } = {}
    currentRaidClass: { [classId: string]: number } = {}

    db: { [name: string]: typeof Datastore } = {};
    
    constructor(
        private readonly kafkaService: KafkaService,
        private readonly configService: ConfigService
    ) {}
    
    onModuleInit() {
        
        this.db.raidfrequencytime = new Datastore({ filename: 'db/raidfrequencytime.db', autoload: true });

        this.kafkaService.raids.subscribe(raid => {
            if (!this.currentRaidTimeHistory[raid.quest_id]) {
                this.currentRaidTimeHistory[raid.quest_id] = 0;
            }
            this.currentRaidTimeHistory[raid.quest_id]++;
            // {
            //     twitterUser: {
            //         name: string,
            //         imgUrl: string,
            //         username: string,
            //         verified: boolean
            //     },
            //     locale: 'EN' | 'JP',
            //     message: string,
            //     battleKey: string,
            //     quest_id: string;
            // }
        });
        this.kafkaService.updates.subscribe(update => {
            if (!this.currentRaidHP[update.hp]) this.currentRaidHP[update.hp] = 0;
            this.currentRaidHP[update.hp]++;

            const splitPlayers = update.players.split('%2F');
            const playerPercent = Math.round((splitPlayers[0] / splitPlayers[1]) * 100);
            if (!this.currentRaidPlayers[playerPercent]) this.currentRaidPlayers[playerPercent] = 0;
            this.currentRaidPlayers[playerPercent]++;

            if (!this.currentRaidClass[update.questHostClass]) this.currentRaidClass[update.questHostClass] = 0;
            this.currentRaidClass[update.questHostClass]++;
            // {
            //     resultStatus: 'success',
            //     link: '#quest/supporter_raid/30467231476/305171/1/3/0/6',
            //     hp: '86',
            //     players: '3%2F30',
            //     timeLeft: '01%3A28%3A48',
            //     questHostClass: '410301',
            //     raidPID: '30467231476',
            //     questID: '305171',
            //     battleKey: raid.battleKey
            // }
            console.log(update);

        });

        setInterval(() => {
            // console.log('creating record')
            // this.db.raidfrequencytime.insert({test: 'hello'+Math.random() })
            this.configService.config.raidmetadata.forEach(raid => {
                this.db.raidfrequencytime.find({ quest_id: raid.quest_id }).exec((result, docs) => {
                    console.log(result, docs);
                })
            });
            // this.configService.config.raidmetadata.forEach(raid => {
            //     this.db.raidfrequencytime.find({ quest_id: raid.quest_id })
            //     if(!this.statistics.raidTimeHistory[raid.quest_id]) this.statistics.raidTimeHistory[raid.quest_id] = [];
            //     this.statistics.raidTimeHistory[raid.quest_id].unshift(this.currentRaidTimeHistory[raid.quest_id] || 0)
            //     if (this.statistics.raidTimeHistory[raid.quest_id].length >= 720) this.statistics.raidTimeHistory[raid.quest_id].pop();
            // });
            // this.currentRaidTimeHistory = {}

            

            // console.log(this.statistics.raidTimeHistory['301061']);
        }, 1000 ); // 1 hour
    }


}
