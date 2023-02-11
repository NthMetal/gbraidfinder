import { Injectable, OnModuleInit } from '@nestjs/common';
// import { Collection, MongoClient, ObjectId } from 'mongodb';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { v4 as uuidv4 } from 'uuid';

import * as dynamo from 'dynamodb';
import * as AWS from 'aws-sdk';
import * as Joi from 'joi';

@Injectable()
export class StatsService implements OnModuleInit {
    // currentRaidTimeHistory: { [questId: string]: number } = {};
    // currentRaidHP: { [hpPercent: number]: number } = {}
    // currentRaidPlayers: { [playerPercent: string]: number } = {}
    // currentRaidClass: { [classId: string]: number } = {}


    currentSegmentStats: {
        [questId: string]: {
            add_count: number,
            add_updateCount: number,
            add_hpSum: number,
            add_playerSum: number,
            add_timeLeftSum: number,
            // add_class: { [add_classId: string]: number }
        }
    } = {}
    allSegmentStats: {
        add_count: number,
        add_updateCount: number,
        add_hpSum: number,
        add_playerSum: number,
        add_timeLeftSum: number,
        // add_class: { [add_classId: string]: number }
    } = {
        add_count: 0,
        add_updateCount: 0,
        add_hpSum: 0,
        add_playerSum: 0,
        add_timeLeftSum: 0
    }
    // collections: { [questId: string]: dynamo.Model<any> } = {}
    Stats: dynamo.Model<any>;

    constructor(
        private readonly kafkaService: KafkaService,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        AWS.config.update({ region: 'us-east-2' });

        const url = this.configService.config.dburl;
        console.log('connecting to: ', url);
        console.log('Connected successfully to server');
        this.Stats = dynamo.define('stats', {
            hashKey: 'pkId',
            // add the timestamp attributes (updatedAt, createdAt)
            timestamps: false,
            schema: {
                pkId: Joi.string(),
                timestamp: Joi.number(),
                questId: Joi.string(),
                count: Joi.number(),
                hpSum: Joi.number(),
                playerSum: Joi.number(),
                timeLeftSum: Joi.number(),
                updateCount: Joi.number()
            },
            indexes: [
                { hashKey: 'questId', rangeKey: 'timestamp', name: 'questId-index', type: 'global' },
            ]
        });

        console.log('Creating Table...');
        const createResult = await new Promise<any>(resolve => {
            // ddb.createTable(params, function(err, data) {
            dynamo.createTables(function(err) {
                if (err) {
                    resolve({
                        success: false,
                        message: 'Error creating table: ',
                        error: err
                    });
                } else {
                    resolve({
                        success: true,
                        message: 'Table has been created',
                        error: null
                    });
                }
            });
        });
        console.log(createResult);

        // this.db.raidfrequencytime = new Datastore({ filename: 'db/raidfrequencytime.db', autoload: true });

        this.kafkaService.raids.subscribe(({ timestamp, raid }) => {
            // console.log(timestamp, new Date(+timestamp), )

            if (!this.currentSegmentStats[raid.quest_id]) {
                this.currentSegmentStats[raid.quest_id] = {
                    add_count: 0,
                    add_updateCount: 0,
                    add_hpSum: 0,
                    add_playerSum: 0,
                    add_timeLeftSum: 0,
                    // add_class: {}
                }
            }

            this.currentSegmentStats[raid.quest_id].add_count++;
            this.allSegmentStats.add_count++;
            // this.collections[raid.quest_id]
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

        this.kafkaService.updates.subscribe(({ timestamp, update }) => {

            if (!this.currentSegmentStats[update.questID]) {
                this.currentSegmentStats[update.questID] = {
                    add_count: 0,
                    add_updateCount: 0,
                    add_hpSum: 0,
                    add_playerSum: 0,
                    add_timeLeftSum: 0,
                    // add_class: {}
                }
            }

            this.currentSegmentStats[update.questID].add_updateCount++

            this.currentSegmentStats[update.questID].add_hpSum += +update.hp;

            const players = +update.players.split('%2F')[0]
            this.currentSegmentStats[update.questID].add_playerSum += players;

            const timeLeftSegments = update.timeLeft.split('%3A');
            const timeLeft = +timeLeftSegments[0] * 60 * 60 +
                +timeLeftSegments[1] * 60 +
                +timeLeftSegments[2]
            this.currentSegmentStats[update.questID].add_timeLeftSum += timeLeft;

            // if (!this.currentSegmentStats[update.questID][timeId.getTime()].add_class[update.questHostClass]) {
            //     this.currentSegmentStats[update.questID][timeId.getTime()].add_class[update.questHostClass] = 0
            // }
            // this.currentSegmentStats[update.questID][timeId.getTime()].add_class[update.questHostClass]++;
            this.allSegmentStats.add_updateCount++;
            this.allSegmentStats.add_hpSum += +update.hp;
            this.allSegmentStats.add_playerSum += players;
            this.allSegmentStats.add_timeLeftSum += timeLeft;
            // if (!this.allSegmentStats[timeId.getTime()].add_class[update.questHostClass]) {
            //     this.allSegmentStats[timeId.getTime()].add_class[update.questHostClass] = 0
            // }
            // this.allSegmentStats[timeId.getTime()].add_class[update.questHostClass]++;
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
            console.log('logging....', this.allSegmentStats);
            
            const intervalTime = this.roundToNearest(new Date());
            const raidQuestIdsAndAll = [...this.configService.config.raidmetadata, {quest_id: 'unknown'}, { quest_id: 'all' }]
            const records = raidQuestIdsAndAll.reduce((acc, raid) => {
                let statsAccessor = raid.quest_id === 'all' ? this.allSegmentStats : this.currentSegmentStats[raid.quest_id];
                if (!statsAccessor) return acc;
                const statsZeroSum = statsAccessor.add_count + statsAccessor.add_hpSum + statsAccessor.add_playerSum + statsAccessor.add_timeLeftSum + statsAccessor.add_updateCount;
                if (statsZeroSum === 0) return acc;
                acc.push({
                    pkId: uuidv4(),
                    timestamp: intervalTime.getTime(),
                    questId: raid.quest_id,
                    count: statsAccessor.add_count,
                    hpSum: statsAccessor.add_hpSum,
                    playerSum: statsAccessor.add_playerSum,
                    timeLeftSum: statsAccessor.add_timeLeftSum,
                    updateCount: statsAccessor.add_updateCount
                });
                return acc;
            }, []);

            console.log(records.length);
            if (records.length) this.Stats.create(records);
            
            // reset stats
            this.currentSegmentStats = {};
            this.allSegmentStats = {
                add_count: 0,
                add_updateCount: 0,
                add_hpSum: 0,
                add_playerSum: 0,
                add_timeLeftSum: 0
            };
        }, 1000 * 60);

    }

    private average(array: number[]): number {
        return array && array.length ? array.reduce((a, b) => a + b) / array.length : 0;
    }

    private roundToNearest(date: Date): Date {
        const ms = 1000 * 60 * 1;
        return new Date(Math.floor(date.getTime() / ms) * ms);
    }

    /**
     * 
     * @param questId the quest id to sarch for including 'all'
     * @param start start date
     * @param end end date
     * @param interval time interval between each data point in minutes (lowest possible is 1 minute)
     */
    public async queryInterval(questId: string, start: Date, end: Date, interval: number, count: number) {
        console.log('getting items', questId, start, end, interval, count);
        // .where('timestamp').between(start.getTime(), end.getTime())
        const query = await new Promise<dynamo.Model<any>[]>(resolve => {
            this.Stats.query(questId).usingIndex('questId-index').where('timestamp').between(start.getTime(), end.getTime()).loadAll().exec(function (err, data) {
                if(err) resolve([]);
                else resolve(data.Items);
            });
        });
        console.log(query.length);
        // const collection = this.collections[questId];
        // const query = await collection.find({
        //     timestamp: {
        //         $gte: start,
        //         $lt: end
        //     }
        // }).toArray();
        const diff = end.getTime() - start.getTime(); // amount of milliseconds
        const timeBetween = Math.floor(diff / count); // time between each interval
        // console.log(timeBetween)

        const reduced = [];

        for (let i = 0; i < count; i++) {
            const currentStart = new Date(start.getTime() + (i * timeBetween));
            const currentEnd = new Date(start.getTime() + ((i + 1) * timeBetween));
            const current = {
                timestamp: currentStart,
                timestampEnd: currentEnd,
                count: 0,
                hpSum: 0,
                playerSum: 0,
                timeLeftSum: 0,
                updateCount: 0
            };

            reduced.push(current);
        }

        for (let record of query) {
            const recordTimestamp = new Date(record.attrs.timestamp).getTime();
            const matchingIndex = Math.floor((recordTimestamp - start.getTime()) / timeBetween);
            const current = reduced[matchingIndex];
            current.count += record.attrs.count;
            current.hpSum += record.attrs.hpSum;
            current.playerSum += record.attrs.playerSum;
            current.timeLeftSum += record.attrs.timeLeftSum;
            current.updateCount += record.attrs.updateCount;
        }

        return reduced;
    }

}
