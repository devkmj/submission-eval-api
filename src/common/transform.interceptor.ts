import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

function hasMessage(x: unknown): x is { message: unknown } {
  return typeof x === 'object' && x !== null && 'message' in x;
}
function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (hasMessage(e) && typeof e.message === 'string') return e.message;
  if (typeof e === 'string') return e;
  try {
    return JSON.stringify(e);
  } catch {
    return 'Unknown error';
  }
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(_: ExecutionContext, next: CallHandler) {
    const t0 = Date.now();
    return next.handle().pipe(
      map((data) => ({
        result: 'ok',
        message: null,
        apiLatency: Date.now() - t0,
        ...data,
      })),
      catchError((e: unknown) =>
        of({
          result: 'failed',
          message: getErrorMessage(e),
          apiLatency: Date.now() - t0,
        }),
      ),
    );
  }
}
