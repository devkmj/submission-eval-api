import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async issueToken(studentId: number, studentName: string): Promise<{ access_token: string }> {
    const payload = { sub: studentId, name: studentName };
    const access_token = await this.jwt.signAsync(payload);
    return { access_token };
  }

  // auth.service.ts
  async login(user: { username: string; userId: number }) {
    const payload = { username: user.username, sub: user.userId };
    return {
      access_token: await this.jwt.signAsync(payload),
    };
  }
}
