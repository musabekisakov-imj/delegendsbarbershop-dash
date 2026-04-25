import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const account = await this.prisma.account.findUnique({ where: { email } });
    if (!account) throw new UnauthorizedException('Invalid credentials');
    if (account.status === 'disabled') throw new UnauthorizedException('Account disabled');

    const ok = await argon2.verify(account.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // Update lastLoginAt — fire-and-forget, don't block the response
    this.prisma.account
      .update({ where: { id: account.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {/* swallow — login succeeded, this is observability */});

    const payload: JwtPayload = {
      sub: account.id,
      tenantId: account.tenantId,
      role: account.role,
      email: account.email,
    };

    return {
      token: this.jwt.sign(payload),
      user: {
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        tenantId: account.tenantId,
        role: account.role,
      },
    };
  }

  async hashPassword(plain: string) {
    return argon2.hash(plain);
  }
}
