import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { Subject } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from './config.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnApplicationShutdown {
  private readonly kafka: Kafka;
  private readonly consumer: Consumer;

  public readonly raids: Subject<any> = new Subject();
  public readonly updates: Subject<any> = new Subject();

  constructor(
    private readonly configService: ConfigService
  ) {
    this.kafka = new Kafka({
        clientId: 'gbstats',
        brokers: this.configService.config.redpandaBrokers
    });

    this.consumer = this.kafka.consumer({ groupId: `gbstats-${uuidv4()}`, allowAutoTopicCreation: true });
  }

  async onApplicationShutdown(signal?: string) {
    await this.consumer.disconnect();
    console.log('gbstats disconnected');
  }
  
  async onModuleInit() {
    await this.consumer.connect();

    await this.consumer.subscribe({ fromBeginning: false, topic: /l.*/ });
    await this.consumer.subscribe({ fromBeginning: false, topic: 'update' });
    await this.consumer.subscribe({ fromBeginning: false, topic: 'unknown' });
    this.consumer.run({
      autoCommit: true,
      eachMessage: async (payload) => {
        const messageString = payload.message.value?.toString();
        if (this.isRaidTopic(payload.topic)) {
          const raid = JSON.parse(messageString || '{}');
          this.raids.next({
            timestamp: payload.message.timestamp,
            raid
          });
        }
        if (payload.topic === 'update') {
          const update = JSON.parse(messageString || '{}');
          this.updates.next({
            timestamp: payload.message.timestamp,
            update
          });
        }
        if (payload.topic === 'unknown') {
          const raid = JSON.parse(messageString || '{}');
          if (raid.quest_id !== 'unknown2') this.raids.next({
            timestamp: payload.message.timestamp,
            raid
          });
        }
      },
    });
  }

  /**
   * determines if a topic sends raid messages
   * raid topics are formatted as `l${levelRequirement}`
   * example: l101
   * @param topic topic string
   * @returns true if the topic sends raid messages, false otherwise
   */
   private isRaidTopic(topic: string): boolean {
    return topic[0] === 'l';
  }

}
