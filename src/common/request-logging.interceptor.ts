import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, map, tap } from 'rxjs';
import { randomUUID } from 'crypto';
import { LogsService, ResultStatus } from '../logs/logs.service';
import { Request, Response } from 'express';
import { Kafka, Producer } from 'kafkajs';

class FailurePayload {}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private producer: Producer;

  constructor(private readonly logs: LogsService) {
    if (process.env.NODE_ENV !== 'test') {
      const kafka = new Kafka({ brokers: [process.env.KAFKA_BROKERS || 'kafka:9092'] });
      this.producer = kafka.producer();
      this.producer.connect();
    } else {
      // 테스트용 mock producer
      this.producer = {
        send: async () => {},
        connect: async () => {},
        disconnect: async () => {},
      } as unknown as Producer;
    }
  }

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const startedAt = Date.now();
    const http = ctx.switchToHttp();
    type ReqWithTrace = Request & { traceId?: string };
    const req = http.getRequest<ReqWithTrace>();
    const res = http.getResponse<Response>();
    const traceId = randomUUID();
    req.traceId = traceId;

    const uri = req.url ?? '';
    const method = req.method ?? 'GET';
    const submissionIdRaw = req.params?.id;
    const submissionId = submissionIdRaw !== undefined ? Number(submissionIdRaw) : undefined;

    let resultStatus: ResultStatus = 'ok';
    let message: string | undefined;

    return next.handle().pipe(
      map((body: unknown) => {
        // business-level 실패(result:"failed") 감지
        const b = body as { result?: unknown; message?: unknown };
        if (b?.result === 'failed') {
          resultStatus = 'failed';
          if (typeof b.message === 'string') message = b.message;
        }
        return body;
      }),
      tap(() => {
        const latencyMs = Date.now() - startedAt;
        const httpStatus = res.statusCode ?? 200;
        void this.logs.saveRequestLog({
          traceId,
          uri,
          method,
          httpStatus,
          resultStatus,
          latencyMs,
          submissionId,
          message,
        });
      }),
      catchError(async (err) => {
        resultStatus = 'error';
        message = err instanceof Error ? err.message : 'Unknown error';
        const latencyMs = Date.now() - Date.now();
        const httpStatus = res.statusCode ?? 500;

        await this.logs.saveRequestLog({
          traceId,
          uri,
          method,
          httpStatus,
          resultStatus,
          latencyMs,
          submissionId,
          message,
        });

        const failurePayload: FailurePayload = {
          traceId,
          submissionId,
          uri,
          method,
          message: message ?? undefined,
        };

        await this.producer.send({
          topic: 'api.failures',
          messages: [{ value: JSON.stringify(failurePayload) }],
        });

        throw err;
      }),
    );
  }
}
