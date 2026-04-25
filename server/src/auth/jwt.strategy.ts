import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;        // account id
  tenantId: string;
  role: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'unsafe-default',
    });
  }

  async validate(payload: JwtPayload) {
    // Re-check that the account still exists + isn't disabled. Without
    // this, a stolen-then-disabled account's token still works until expiry.
    const account = await this.prisma.account.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true, tenantId: true, email: true },
    });
    if (!account || account.status === 'disabled') {
      throw new UnauthorizedException('Account is disabled or no longer exists');
    }
    return account;
  }
}
