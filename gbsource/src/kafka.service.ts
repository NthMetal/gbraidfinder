import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Admin, Consumer, Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from './config.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnApplicationShutdown {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly admin: Admin;
  private producerConnected = false;

  constructor(
    private readonly configService: ConfigService
  ) {
    this.kafka = new Kafka({
        clientId: `gbsource-${uuidv4()}`,
        brokers: this.configService.config.redpandaBrokers
        // brokers: ['127.0.0.1:19092', '127.0.0.1:19093', '127.0.0.1:19094']
        // brokers: [ 'a767c6a677aae414eaf968b58aedc13f-630756403.us-east-2.elb.amazonaws.com:9092' ]
    });

    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
    this.consumer = this.kafka.consumer({ groupId: `gbrsource-${uuidv4()}`, allowAutoTopicCreation: true });
    this.admin    = this.kafka.admin();
  }

  async onApplicationShutdown(signal?: string) {
    this.producerConnected = false;
    await this.producer.disconnect();
    await this.consumer.disconnect();
    await this.admin.disconnect();
    console.log('gbrsource disconnected');
  }
  
  async onModuleInit() {
    await this.producer.connect();
    await this.consumer.connect();
    await this.admin.connect();

    console.log('connected');
    
    this.producerConnected = true;
    this.consumer.subscribe({ fromBeginning: false, topic: 'member_events' });
    this.consumer.run({
      autoCommit: true,
      eachMessage: async (payload) => {
        if (payload.topic === 'member_events') {
          const messageString = payload.message.value?.toString();
          if (messageString === 'restart') {
            setTimeout(async () => {
              console.log('disconnecting producer');
              await this.producer.disconnect();
              console.log('reconnecting producer');
              await this.producer.connect();
            }, 2000);
          }
        }
      },
    });

    this.producer.on('producer.connect', () => {
      this.producerConnected = true;
    });
    this.producer.on('producer.disconnect', () => {
      this.producerConnected = false;
    });

    /**
     * When the config is first loaded, or updated
     * Check if all the topics exist, add a new one if it doesn't
     */
    this.configService.configBehaviorSubject.subscribe(async config => {
      const topics = await this.admin.listTopics();
      const levelTopics = topics.filter(topic => topic[0] === 'l');
      const topicMetadata = await this.admin.fetchTopicMetadata({ topics: [levelTopics[0]] });
      const partitionsPerTopic = topicMetadata.topics[0].partitions.length;
      const raidMetadataLevels = new Set(config.raidmetadata.map(metadata => metadata.level));
      const topicsToCreate = [];
      raidMetadataLevels.forEach(level => {
        if (!topics.includes(`l${level}`)) topicsToCreate.push({
          topic: `l${level}`,
          numPartitions: partitionsPerTopic
        });
      });

      if (!topics.includes('update')) topicsToCreate.push({topic: 'update' });
      if (!topics.includes('member_events')) topicsToCreate.push({topic: 'member_events' });

      console.log('config updated creating topics: ', topicsToCreate);
      await this.admin.createTopics({
        topics: topicsToCreate
      });
    });
  }

  async sendRaid(raid: any, level: number) {
    if (!this.producerConnected) return;
    await this.producer.send({
      topic: `l${level}`,
      messages: [
        { value: JSON.stringify(raid) }
      ],
    });
  }

  async sendMetadata(raidmetadata: any) {
    if (!this.producerConnected) return;
    await this.producer.send({
      topic: `raidmetadata`,
      messages: [
        { value: JSON.stringify(raidmetadata) }
      ],
    });
  }
  
}
