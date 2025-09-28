import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  it('login이 호출되면 토큰을 반환해야 한다', async () => {
    const result = await service.login({ username: 'test', userId: 123 });

    expect(jwtService.signAsync).toHaveBeenCalledWith({ username: 'test', sub: 123 });
    expect(result).toEqual({ access_token: 'mock-jwt' });
  });

  it('jwtService.signAsync가 실패하면 에러를 던져야 한다', async () => {
    (jwtService.signAsync as jest.Mock).mockRejectedValue(new Error('sign failed'));

    await expect(service.login({ username: 'bad', userId: 999 })).rejects.toThrow('sign failed');
  });
});
