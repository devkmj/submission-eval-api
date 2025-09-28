import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './common/transform.interceptor';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 전역 파이프 (DTO 유효성 검증 + 자동 변환)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 전역 인터셉터 등록
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));

  // Swagger setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Submission Evaluation API')
    .setDescription('REST API for essay submission & evaluation (MVP)')
    .setVersion('v1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(3000);
}
bootstrap();
