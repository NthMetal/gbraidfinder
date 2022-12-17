import { Injectable, OnModuleInit } from '@nestjs/common';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { ConfigService } from './config.service';
import { KafkaService } from './kafka.service';
import { v4 as uuidv4 } from 'uuid';

import * as fs from 'fs';
import e from 'express';

@Injectable()
export class StatsService implements OnModuleInit {
    // currentRaidTimeHistory: { [questId: string]: number } = {};
    // currentRaidHP: { [hpPercent: number]: number } = {}
    // currentRaidPlayers: { [playerPercent: string]: number } = {}
    // currentRaidClass: { [classId: string]: number } = {}


    currentSegmentStats: {
        [questId: string]: {
            [timestamp: number]: {
                add_count: number,
                add_updateCount: number,
                add_hpSum: number,
                add_playerSum: number,
                add_timeLeftSum: number,
                // add_class: { [add_classId: string]: number }
            }
        }
    } = {}
    allSegmentStats: {
        [timestamp: number]: {
            add_count: number,
            add_updateCount: number,
            add_hpSum: number,
            add_playerSum: number,
            add_timeLeftSum: number,
            // add_class: { [add_classId: string]: number }
        }
    } = {}
    collections: { [questId: string]: Collection<any> } = {}

    constructor(
        private readonly kafkaService: KafkaService,
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        const url = this.configService.config.dburl;
        console.log('connecting to: ', url);
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

        this.kafkaService.raids.subscribe(({ timestamp, raid }) => {
            const timeId = this.roundToNearest(timestamp);
            // console.log(timestamp, new Date(+timestamp), )

            if (!this.currentSegmentStats[raid.quest_id]) {
                this.currentSegmentStats[raid.quest_id] = {
                    [timeId.getTime()]: {
                        add_count: 0,
                        add_updateCount: 0,
                        add_hpSum: 0,
                        add_playerSum: 0,
                        add_timeLeftSum: 0,
                        // add_class: {}
                    }
                }
            }
            if (!this.currentSegmentStats[raid.quest_id][timeId.getTime()]) {
                this.currentSegmentStats[raid.quest_id][timeId.getTime()] = {
                    add_count: 0,
                    add_updateCount: 0,
                    add_hpSum: 0,
                    add_playerSum: 0,
                    add_timeLeftSum: 0,
                    // add_class: {}
                }
            }

            this.currentSegmentStats[raid.quest_id][timeId.getTime()].add_count++;

            if (!this.allSegmentStats[timeId.getTime()]) {
                this.allSegmentStats[timeId.getTime()] = {
                    add_count: 0,
                    add_updateCount: 0,
                    add_hpSum: 0,
                    add_playerSum: 0,
                    add_timeLeftSum: 0,
                    // add_class: {}
                }
            }
            this.allSegmentStats[timeId.getTime()].add_count++;
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
            const timeId = this.roundToNearest(timestamp);

            if (!this.currentSegmentStats[update.questID]) {
                this.currentSegmentStats[update.questID] = {
                    [timeId.getTime()]: {
                        add_count: 0,
                        add_updateCount: 0,
                        add_hpSum: 0,
                        add_playerSum: 0,
                        add_timeLeftSum: 0,
                        // add_class: {}
                    }
                }
            }
            if (!this.currentSegmentStats[update.questID][timeId.getTime()]) {
                this.currentSegmentStats[update.questID][timeId.getTime()] = {
                    add_count: 0,
                    add_updateCount: 0,
                    add_hpSum: 0,
                    add_playerSum: 0,
                    add_timeLeftSum: 0,
                    // add_class: {}
                }
            }

            this.currentSegmentStats[update.questID][timeId.getTime()].add_updateCount++

            this.currentSegmentStats[update.questID][timeId.getTime()].add_hpSum += +update.hp;

            const players = +update.players.split('%2F')[0]
            this.currentSegmentStats[update.questID][timeId.getTime()].add_playerSum += players;

            const timeLeftSegments = update.timeLeft.split('%3A');
            const timeLeft = +timeLeftSegments[0] * 60 * 60 +
                +timeLeftSegments[1] * 60 +
                +timeLeftSegments[2]
            this.currentSegmentStats[update.questID][timeId.getTime()].add_timeLeftSum += timeLeft;

            // if (!this.currentSegmentStats[update.questID][timeId.getTime()].add_class[update.questHostClass]) {
            //     this.currentSegmentStats[update.questID][timeId.getTime()].add_class[update.questHostClass] = 0
            // }
            // this.currentSegmentStats[update.questID][timeId.getTime()].add_class[update.questHostClass]++;


            if (!this.allSegmentStats[timeId.getTime()]) {
                this.allSegmentStats[timeId.getTime()] = {
                    add_count: 0,
                    add_updateCount: 0,
                    add_hpSum: 0,
                    add_playerSum: 0,
                    add_timeLeftSum: 0,
                    // add_class: {}
                }
            }
            this.allSegmentStats[timeId.getTime()].add_updateCount++;
            this.allSegmentStats[timeId.getTime()].add_hpSum += +update.hp;
            this.allSegmentStats[timeId.getTime()].add_playerSum += players;
            this.allSegmentStats[timeId.getTime()].add_timeLeftSum += timeLeft;
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
            console.log('logging....', this.configService.config.raidmetadata.length);

            const raidQuestIdsAndAll = [...this.configService.config.raidmetadata, { quest_id: 'all' }]
            raidQuestIdsAndAll.forEach(raid => {
                const statsAccessor = raid.quest_id === 'all' ? this.allSegmentStats : this.currentSegmentStats[raid.quest_id];
                if (!statsAccessor) return;

                const bulkWriteOperation = Object.entries(statsAccessor).map(([time, additions]) => {
                    // const classUpdate = Object.entries(additions.add_class).reduce((acc, [classId, add_classCount]) => {
                    //     acc['class.' + (classId || 0)] = add_classCount || 0
                    //     return acc;
                    // }, {});
                    return {
                        updateOne: {
                            filter: { timestamp: new Date(+time) },
                            update: {
                                $inc: {
                                    count: additions.add_count,
                                    updateCount: additions.add_updateCount,
                                    hpSum: additions.add_hpSum,
                                    playerSum: additions.add_playerSum,
                                    timeLeftSum: additions.add_timeLeftSum,
                                    // ...classUpdate
                                }
                            },
                            upsert: true
                        }
                    }
                });
                if (bulkWriteOperation.length) this.collections[raid.quest_id].bulkWrite(bulkWriteOperation).then(result => { });
            });

            // reset stats
            this.currentSegmentStats = {};
            this.allSegmentStats = {};
        }, 1000 * 60);

    }

    private average(array: number[]): number {
        return array && array.length ? array.reduce((a, b) => a + b) / array.length : 0;
    }

    private roundToNearest(dateish: Date): Date {
        const date = new Date(+dateish);
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
        const collection = this.collections[questId];
        const query = await collection.find({
            timestamp: {
                $gte: start,
                $lt: end
            }
        }).toArray();
        const diff = end.getTime() - start.getTime(); // amount of milliseconds
        const timeBetween = Math.floor(diff / count); // time between each interval
        console.log(timeBetween)
        
        const reduced = [];

        for (let i=0; i<count; i++) {
            const currentStart = new Date(start.getTime() + (i * timeBetween));
            const currentEnd   = new Date(start.getTime() + ((i + 1) * timeBetween));
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
            const recordTimestamp = new Date(record.timestamp).getTime();
            const matchingIndex = Math.floor((recordTimestamp - start.getTime()) / timeBetween);
            const current = reduced[matchingIndex];
            current.count += record.count;
            current.hpSum += record.hpSum;
            current.playerSum += record.playerSum;
            current.timeLeftSum += record.timeLeftSum;
            current.updateCount += record.updateCount;
        }

        return reduced;
    }

}
