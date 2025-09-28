import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            issueToken: jest.fn().mockResolvedValue({ access_token: 'mock-jwt' }),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it('AuthService.issueToken을 호출하고 토큰을 반환해야 한다', async () => {
    const dto = { studentId: 3, studentName: '김지연' };
    const result = await controller.login(dto);

    expect(service.issueToken).toHaveBeenCalledWith(3, '김지연');
    expect(result).toEqual({ access_token: 'mock-jwt' });
  });
});
