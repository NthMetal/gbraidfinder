import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StatsService implements OnModuleInit {
    // currentRaidTimeHistory: { [questId: string]: number } = {};
    // currentRaidHP: { [hpPercent: number]: number } = {}
    // currentRaidPlayers: { [playerPercent: string]: number } = {}
    // currentRaidClass: { [classId: string]: number } = {}


    currentSegmentStats: { 
        [questId: string]: {
            timestamp: Date,
            count: number,
            hpPercents: number[],
            avgPlayers: number[],
            timeLeft: number[],
            class: { [classId: string]: number }
        }
    } = {}
    collections: { [questId: string]: Collection<any> } = {}
    
    constructor(
        private readonly kafkaService: KafkaService,
        private readonly configService: ConfigService
    ) {}
    
    async onModuleInit() {
        const url = this.configService.config.dburl;
        const client = new MongoClient(url);
        await client.connect();
        console.log('Connected successfully to server');
        const db = client.db('gbstats');
        this.collections = this.configService.config.raidmetadata.reduce((acc, raid) => {
            acc[raid.quest_id] = db.collection(raid.quest_id);
            return acc;
        }, {});
        this.collections.all = db.collection('all');
        // this.db.raidfrequencytime = new Datastore({ filename: 'db/raidfrequencytime.db', autoload: true });

        this.kafkaService.raids.subscribe(raid => {
            if (!this.currentSegmentStats[raid.quest_id]) {
                this.currentSegmentStats[raid.quest_id] = {
                    timestamp: new Date(),
                    count: 0,
                    hpPercents: [],
                    avgPlayers: [],
                    timeLeft: [],
                    class: {}
                }
            }
            this.currentSegmentStats[raid.quest_id].count++;
            
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
            if (!this.currentSegmentStats[update.questID]) {
                this.currentSegmentStats[update.questID] = {
                    timestamp: new Date(),
                    count: 0,
                    hpPercents: [],
                    avgPlayers: [],
                    timeLeft: [],
                    class: {}
                }
            }
            // Push updates 
            this.currentSegmentStats[update.questID].hpPercents.push(+update.hp);
            this.currentSegmentStats[update.questID].avgPlayers.push(+update.players.split('%2F')[0]);
            const timeLeft = update.timeLeft.split('%3A');
            this.currentSegmentStats[update.questID].timeLeft.push(
                +timeLeft[0] * 60 * 60 +
                +timeLeft[1] * 60 + 
                +timeLeft[2]
            );

            if (!this.currentSegmentStats[update.questID].class[update.questHostClass]) {
                this.currentSegmentStats[update.questID].class[update.questHostClass] = 0
            }
            this.currentSegmentStats[update.questID].class[update.questHostClass]++;
            
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
            // console.log(update);

        });

        setInterval(() => {
            console.log('inserting....', JSON.stringify(this.currentSegmentStats['300041']));
            const totalStats = {
                count: 0,
                hpPercent: [],
                avgPlayers: [],
                timeLeft: [],
                class: {}
            };
            this.configService.config.raidmetadata.forEach(raid => {
                if (this.currentSegmentStats[raid.quest_id]) {
                    const segment = this.currentSegmentStats[raid.quest_id];
                    // calculate stats for questid and and insert into relevant collection
                    const calculatedStats = {
                        _id: new ObjectId(),
                        timestamp: new Date(),
                        count: segment.count,
                        hpPercent: this.average(segment.hpPercents),
                        avgPlayers: this.average(segment.avgPlayers),
                        timeLeft: this.average(segment.timeLeft),
                        class: segment.class
                    }
                    this.collections[raid.quest_id].insertOne(calculatedStats);

                    // Add stats to total stat calculations
                    totalStats.count += segment.count;
                    totalStats.hpPercent.push(...segment.hpPercents);
                    totalStats.avgPlayers.push(...segment.avgPlayers);
                    totalStats.timeLeft.push(...segment.timeLeft);
                    totalStats.class = {...totalStats.class, ...segment.class}

                    // Reset stats for next iteration
                    this.currentSegmentStats[raid.quest_id] = {
                        timestamp: new Date(),
                        count: 0,
                        hpPercents: [],
                        avgPlayers: [],
                        timeLeft: [],
                        class: {}
                    }
                }
            });

            // calculate total stats and add to all collection
            const totalCalculatedStats = {
                _id: new ObjectId(),
                timestamp: new Date(),
                count: totalStats.count,
                hpPercent: this.average(totalStats.hpPercent),
                avgPlayers: this.average(totalStats.avgPlayers),
                timeLeft: this.average(totalStats.timeLeft),
                class: totalStats.class
            }
            this.collections.all.insertOne(totalCalculatedStats);
        }, 1000 * 60);

    }

    private average(array: number[]): number {
        return array && array.length ? array.reduce((a, b) => a + b) / array.length : 0;
    }

}
