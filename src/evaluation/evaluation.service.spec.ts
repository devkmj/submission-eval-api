import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { AzureOpenAI } from 'openai';

// 공통 mock 객체
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    AzureOpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [EvaluationService],
    }).compile();

    service = module.get(EvaluationService);
  });

  it('정상 응답 시 평가 결과 반환', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '{"score":5,"feedback":"ok","highlights":["test"]}',
          },
        },
      ],
    });

    const result = await service.evaluateEssay('Hello world');
    expect(result).toMatchObject({
      score: 5,
      feedback: 'ok',
      highlights: ['test'],
    });
    expect(result).toHaveProperty('highlightSubmitText');
    expect(result).toHaveProperty('latencyMs');
  });

  it('JSON 파싱 실패 시 fallback', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'invalid-json' } }],
    });

    const result = await service.evaluateEssay('Hello');
    expect(result.feedback).toContain('Automatic evaluation summary');
  });

  it('응답 choices 비어있을 때 fallback', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });

    const result = await service.evaluateEssay('Hello');
    expect(result.score).toBe(0);
  });

  it('OpenAI SDK 호출 에러 시 InternalServerErrorException', async () => {
    mockCreate.mockRejectedValueOnce(new Error('boom'));

    await expect(service.evaluateEssay('Hello')).rejects.toThrow(/OpenAI evaluation failed/);
  });
});
