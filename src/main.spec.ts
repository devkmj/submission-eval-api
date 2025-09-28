import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('App bootstrap', () => {
  it('AppModule should be defined', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
  });
});
