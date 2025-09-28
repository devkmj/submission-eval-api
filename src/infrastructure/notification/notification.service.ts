import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer } from 'kafkajs';
import axios from 'axios';

interface FailurePayload {
  traceId?: string;
  submissionId?: number;
  uri?: string;
  method?: string;
  message?: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private consumer: Consumer;

  async onModuleInit() {
    const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'] });
    this.consumer = kafka.consumer({ groupId: 'notification-group' });

    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'api.failures', fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        const raw = message.value;
        const value = raw ? raw.toString() : '{}';

        const payload = JSON.parse(value) as FailurePayload;
        await this.sendSlackAlert(payload);
      },
    });
  }

  private async sendSlackAlert(payload: FailurePayload) {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL!;
    const text = `🚨 API Failure Detected
- traceId: ${payload.traceId ?? 'N/A'}
- submissionId: ${payload.submissionId ?? 'N/A'}
- uri: ${payload.uri ?? 'N/A'}
- method: ${payload.method ?? 'N/A'}
- message: ${payload.message ?? 'N/A'}`;

    await axios.post(webhookUrl, { text });
  }
}
