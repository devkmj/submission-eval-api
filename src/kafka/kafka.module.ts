import { Module } from '@nestjs/common';
import { Kafka, Partitioners } from 'kafkajs';

@Module({
  providers: [
    {
      provide: 'KAFKA_PRODUCER',
      useFactory: async () => {
        if (process.env.NODE_ENV === 'test') {
          // 태스트 환경에서는 mock producer 리턴
          return {
            connect: async () => {},
            send: async () => {},
            disconnect: async () => {},
          };
        }

        // 운영 환경: 실제 연결
        const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'] });
        const producer = kafka.producer({
          createPartitioner: Partitioners.LegacyPartitioner,
        });
        await producer.connect();
        return producer;
      },
    },
  ],
  exports: ['KAFKA_PRODUCER'],
})
export class KafkaModule {}
