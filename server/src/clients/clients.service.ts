import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

/**
 * Shape the raw Prisma client row into the frontend's Client interface.
 * The frontend expects `officeIds: string[]` — we flatten the join table.
 */
function toClientShape(raw: { officeLinks: { officeId: string }[] } & Record<string, unknown>) {
  const { officeLinks, ...rest } = raw;
  return { ...rest, officeIds: officeLinks.map((l: { officeId: string }) => l.officeId) };
}

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, officeId?: string, includeArchived = false) {
    const rows = await this.prisma.client.findMany({
      where: {
        tenantId,
        ...(!includeArchived && { deletedAt: null }),
        ...(officeId && { officeLinks: { some: { officeId } } }),
      },
      include: { officeLinks: { select: { officeId: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toClientShape);
  }

  async findOne(tenantId: string, id: string, includeArchived = true) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, ...(!includeArchived && { deletedAt: null }) },
      include: { officeLinks: { select: { officeId: true } } },
    });
    if (!client) throw new NotFoundException('Client not found');
    return toClientShape(client);
  }

  async create(tenantId: string, dto: CreateClientDto) {
    const row = await this.prisma.client.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes ?? '',
        gender: dto.gender,
        ...(dto.officeIds?.length && {
          officeLinks: {
            createMany: { data: dto.officeIds.map(officeId => ({ officeId })) },
          },
        }),
      },
      include: { officeLinks: { select: { officeId: true } } },
    });
    return toClientShape(row);
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(tenantId, id);
    const row = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        // Replace office links when officeIds is provided.
        ...(dto.officeIds !== undefined && {
          officeLinks: {
            deleteMany: {},
            createMany: { data: dto.officeIds.map(officeId => ({ officeId })) },
          },
        }),
      },
      include: { officeLinks: { select: { officeId: true } } },
    });
    return toClientShape(row);
  }

  async softDelete(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Client not found');
    return this.prisma.client.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async restore(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Client not found');
    const row = await this.prisma.client.update({
      where: { id },
      data: { deletedAt: null },
      include: { officeLinks: { select: { officeId: true } } },
    });
    return toClientShape(row);
  }
}
