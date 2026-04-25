import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InviteAccountDto } from './dto/invite-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

/**
 * Flatten officeLinks into `officeIds: string[]` to match the frontend
 * Account interface.
 */
function toAccountShape(raw: { officeLinks: { officeId: string }[] } & Record<string, unknown>) {
  const { officeLinks, passwordHash: _, ...rest } = raw;
  return { ...rest, officeIds: officeLinks.map((l: { officeId: string }) => l.officeId) };
}

const INCLUDE = { officeLinks: { select: { officeId: true } } } as const;

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const rows = await this.prisma.account.findMany({
      where: { tenantId },
      include: INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toAccountShape);
  }

  async findOne(tenantId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, tenantId },
      include: INCLUDE,
    });
    if (!account) throw new NotFoundException('Account not found');
    return toAccountShape(account);
  }

  async invite(tenantId: string, dto: InviteAccountDto) {
    const exists = await this.prisma.account.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('An account with this email already exists');

    // Hash a random temp password — the invited user will reset it via link.
    const tempPassword = randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    const row = await this.prisma.account.create({
      data: {
        tenantId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        status: 'invited',
        passwordHash,
        avatarUrl: dto.avatarUrl,
        staffId: dto.staffId,
        ...(dto.officeIds?.length && {
          officeLinks: {
            createMany: { data: dto.officeIds.map(officeId => ({ officeId })) },
          },
        }),
      },
      include: INCLUDE,
    });
    return toAccountShape(row);
  }

  async update(tenantId: string, id: string, dto: UpdateAccountDto) {
    const account = await this.prisma.account.findFirst({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Account not found');

    // Guard: cannot demote the last active owner.
    if (
      account.role === 'owner' &&
      dto.role !== undefined &&
      dto.role !== 'owner'
    ) {
      const activeOwners = await this.prisma.account.count({
        where: { tenantId, role: 'owner', status: 'active' },
      });
      if (activeOwners <= 1) {
        throw new BadRequestException('Cannot demote the last active owner');
      }
    }

    const row = await this.prisma.account.update({
      where: { id },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.officeIds !== undefined && {
          officeLinks: {
            deleteMany: {},
            createMany: { data: dto.officeIds.map(officeId => ({ officeId })) },
          },
        }),
      },
      include: INCLUDE,
    });
    return toAccountShape(row);
  }

  /**
   * Soft-disable — sets status to 'disabled' rather than hard-deleting.
   * Preserves audit trail and prevents the token-still-works attack vector
   * (jwt.strategy.ts already rejects disabled accounts on every request).
   */
  async disable(tenantId: string, id: string) {
    const account = await this.prisma.account.findFirst({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Account not found');

    if (account.role === 'owner') {
      const activeOwners = await this.prisma.account.count({
        where: { tenantId, role: 'owner', status: 'active' },
      });
      if (activeOwners <= 1) {
        throw new BadRequestException('Cannot disable the last active owner');
      }
    }

    const row = await this.prisma.account.update({
      where: { id },
      data: { status: 'disabled' },
      include: INCLUDE,
    });
    return toAccountShape(row);
  }
}
