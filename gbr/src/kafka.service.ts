import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { Cluster } from '@nestjs/microservices/external/kafka.interface';
import { Admin, Consumer, GroupMember, GroupMemberAssignment, GroupState, Kafka, Producer, AssignerProtocol } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import { AppService } from './app.service';
import { ConfigService } from './config.service';

@Injectable()
export class KafkaService implements OnModuleInit, OnApplicationShutdown {
  private readonly kafka: Kafka;
  private readonly producer: Producer;
  private readonly consumer: Consumer;
  private readonly admin: Admin;

  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService
  ) {
    this.kafka = new Kafka({
      clientId: `gbr-${this.appService.getAccount().rank}-${uuidv4()}`,
      brokers: this.configService.config.redpandaBrokers
    });
    this.producer = this.kafka.producer({ allowAutoTopicCreation: true });
    this.consumer = this.kafka.consumer({ 
      groupId: 'gbr',
      allowAutoTopicCreation: true,
      partitionAssigners: [
        (config: {
          cluster: Cluster
          groupId: string
        }) => {
          /** 
           * Kafka custom assigner for spreading out which gbr handles getting the raid update
           * determines only valid gbr instances then distributes every topic partition evenly by
           * starting at the highest topic level (because those need to be distributed to highest account ranks)
           * and assigning each topic partition to the valid member that has the least currently assigned partitions
           */
          const assign: (group: { members: GroupMember[]; topics: string[] }) => Promise<GroupMemberAssignment[]> = async (group) => {
            const membersCount = group.members.length
            const sortedMembers = group.members.map(({ memberId }) => memberId).sort()
            const assignment: { [member: string]: { [topic: string]: number[] }} = {}

            const topicsPartitions = group.topics.flatMap(topic => {
              const partitionMetadata = config.cluster.findTopicPartitionMetadata(topic)
              return partitionMetadata.map(m => ({ topic: topic, partitionId: m.partitionId }))
            })
            const sortedTopicsPartitions = topicsPartitions.sort((topicA, topicB) => {
              const topicARank = +topicA.topic.slice(1);
              const topicBRank = +topicB.topic.slice(1);
              return topicBRank - topicARank
            });
            const getTotalPerAssignee = (assignee) => {
              if (!assignment[assignee]) return 0;
              return Object.values(assignment[assignee]).flat().length
            }
            sortedTopicsPartitions.forEach((topicPartition, i) => {
              const topicRank = +topicPartition.topic.slice(1);
              const validAssignees = sortedMembers.filter(member => topicRank <= +member.split('-')[1]);

              const assignee = validAssignees.reduce((prev, curr) => {
                const prevTotal = getTotalPerAssignee(prev);
                const currTotal = getTotalPerAssignee(curr);
                return prevTotal < currTotal ? prev : curr
              });
              // console.log(topicPartition, assignment, assignee);
              // const assignee = validAssignees[i % validAssignees.length]
              
              if (!assignment[assignee]) assignment[assignee] = {}
              if (!assignment[assignee][topicPartition.topic]) assignment[assignee][topicPartition.topic] = []
              assignment[assignee][topicPartition.topic].push(topicPartition.partitionId)
            })
        
            const roundRobin = Object.keys(assignment).map(memberId => ({
              memberId,
              memberAssignment: AssignerProtocol.MemberAssignment.encode({
                version: 1,
                assignment: assignment[memberId],
                userData: undefined
              }),
            }));
            console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
            console.log(group.topics);
            console.log(sortedTopicsPartitions, sortedMembers);
            console.log(assignment);
            return roundRobin;
          }
          const protocol: (subscription: { topics: string[] }) => GroupState = (subscription) => {
            return {
              name: 'GBRAssigner',
              metadata: AssignerProtocol.MemberMetadata.encode({
                version: 1,
                topics: subscription.topics,
                userData: undefined
              }),
            }
          }
          return {
            name: 'GBRAssigner',
            version: 1,
            assign,
            protocol
          }
        }
      ]
    });
    this.admin    = this.kafka.admin();
  }

  async onApplicationShutdown(signal?: string) {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    console.log('gbr disconnected');
  }

  async onModuleInit() {
    /** connect producer, consumer, initialize partitions, and get topics */
    await this.producer.connect();
    await this.consumer.connect();
    await this.checkPartitionsGetTopics();

    await this.consumer.subscribe({ fromBeginning: false, topic: /l.*/ });
    return await this.consumer.run({
      autoCommit: true,
      eachMessage: async payload => {
        if (this.isRaidTopic(payload.topic)) {
          const messageString = payload.message.value?.toString();
          const raid = JSON.parse(messageString || '{}'); // everything comes as a buffer
          
          // console.log(payload.topic, payload.partition, this.appService.getAccount().rank, 'processing ', raid.battleKey);
          // {"locale":"JP","message":"","battleKey":"F35BF263","quest_id":"301061"}
          const update = await this.appService.getRaidInfo(raid.battleKey);
          // console.log(topic, partition, raid, update); // print the message
          // this.sendUpdate({
          //   resultStatus: 'success',
          //   link: '#quest/supporter_raid/30836405665/305361/1/3/0/2',
          //   hp: '98',
          //   players: '1/30',
          //   timeLeft: '01:24:35',
          //   questHostClass: '100401',
          //   raidPID: '30836405665',
          //   questID: '305361',
          //   battleKey: '1A67620A'
          // });
          if (update.status === 'success' && update.data && update.data.resultStatus === 'success') {
            // console.log(JSON.stringify(update));
            this.sendUpdate(update.data);
          }
        }
      },
    });
  }

  /**
   * creates a partition for this consumer if one doesn't already exist
   * list of consumers does not include current consumer
   * example: 
   *     consumers: ['consumer1'] <- consumer2 will be added
   *     partitions: [ 1 ]
   * adding consumer2 will mean we also need to add another partition
   * gbrsource producer must reconnect when partition is added
   * therefore send message through member_events topic notifying the producer needs to restart
   * @returns string list of all topics
   */
  private async checkPartitionsGetTopics() {
    await this.admin.connect();
    const groupDescription = await this.admin.describeGroups(['gbr']);
    const numConnectedClients = groupDescription.groups[0].members.length;
    const topics = await this.admin.listTopics();
    const levelTopics = topics.filter(topic => this.isRaidTopic(topic));
    if (!levelTopics.length) return [];
    const topicMetadata = await this.admin.fetchTopicMetadata({ topics: [levelTopics[0]] });
    const partitionsPerTopic = topicMetadata.topics[0].partitions.length;
    console.log('connected clients: ', numConnectedClients, 'partitions per topic: ', partitionsPerTopic);
    if (numConnectedClients >= partitionsPerTopic) {
      const newPartitionCount = numConnectedClients === partitionsPerTopic ? numConnectedClients + 1 : numConnectedClients;
      console.log('Creating partition for new consumer', levelTopics.map(topic => ({topic, count: newPartitionCount })));
      await this.admin.createPartitions({
        topicPartitions: levelTopics.map(topic => ({topic, count: newPartitionCount }))
      });
      this.sendMemberEvent();
    }
    this.admin.disconnect();
    return topics;
  }

  /**
   * Sends a restart event to member_events topic
   */
  private async sendMemberEvent() {
    await this.producer.send({
      topic: `member_events`,
      // topic: 'chat-room',
      messages: [
        { value: 'restart' }
      ],
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

  /**
   * sends an update to the update topic
   * @param update update to send
   */
  async sendUpdate(update: any) {
    await this.producer.send({
      topic: `update`,
      messages: [
        { value: JSON.stringify(update) }
      ],
    });
  }
}
