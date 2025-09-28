import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import axios from 'axios';

const consumerMock = {
  connect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn(),
};

jest.mock('kafkajs', () => {
  return {
    Kafka: jest.fn().mockImplementation(() => ({
      consumer: () => consumerMock,
    })),
  };
});

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    service = module.get(NotificationService);
    // consumerMock is already defined above
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('초기화 시 Kafka에 연결하고 구독해야 한다', async () => {
    await service.onModuleInit();

    expect(consumerMock.connect).toHaveBeenCalled();
    expect(consumerMock.subscribe).toHaveBeenCalledWith({
      topic: 'api.failures',
      fromBeginning: true,
    });
    expect(consumerMock.run).toHaveBeenCalled();
  });

  it('should send Slack alert via axios', async () => {
    process.env.SLACK_WEBHOOK_URL = 'http://mock-slack-webhook';

    const payload = {
      traceId: '123',
      submissionId: 42,
      uri: '/test',
      method: 'POST',
      message: 'Something failed',
    };
    await (service as any).sendSlackAlert(payload);

    expect(mockedAxios.post).toHaveBeenCalledWith('http://mock-slack-webhook', {
      text: expect.stringContaining('🚨 API Failure Detected'),
    });
  });
});
