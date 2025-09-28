import { of } from 'rxjs';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { RequestLoggingInterceptor } from './request-logging.interceptor';
import { LogsService } from '../logs/logs.service';

describe('RequestLoggingInterceptor (요청 로깅 인터셉터)', () => {
  let interceptor: RequestLoggingInterceptor;
  let logsService: LogsService;

  beforeEach(() => {
    logsService = {
      saveRequestLog: jest.fn().mockResolvedValue(undefined),
    } as unknown as LogsService;

    interceptor = new RequestLoggingInterceptor(logsService);
  });

  function createExecutionContext(responseStatus = 200, params: Record<string, string> = {}) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url: '/test',
          method: 'GET',
          params,
        }),
        getResponse: () => ({
          statusCode: responseStatus,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('성공적인 응답을 "ok" 상태와 올바른 HTTP 코드로 로깅해야 한다', (done) => {
    const context = createExecutionContext(200);
    const callHandler: CallHandler = {
      handle: () => of({ result: 'success' }),
    };

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        const saveLogMock = logsService.saveRequestLog as jest.Mock;
        expect(saveLogMock).toHaveBeenCalledTimes(1);
        const logArg = saveLogMock.mock.calls[0][0];
        expect(logArg.resultStatus).toBe('ok');
        expect(logArg.httpStatus).toBe(200);
        done();
      },
      error: done.fail,
    });
  });

  it('"failed" 상태의 실패 결과 응답을 로깅해야 한다', (done) => {
    const context = createExecutionContext(400);
    const callHandler: CallHandler = {
      handle: () => of({ result: 'failed' }),
    };

    interceptor.intercept(context, callHandler).subscribe({
      next: () => {
        expect(logsService.saveRequestLog).toHaveBeenCalledTimes(1);
        const logArg = (logsService.saveRequestLog as jest.Mock).mock.calls[0][0];
        expect(logArg.resultStatus).toBe('failed');
        expect(logArg.httpStatus).toBe(400);
        done();
      },
      error: done.fail,
    });
  });
});
