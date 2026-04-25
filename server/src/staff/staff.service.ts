import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

/**
 * Flatten officeLinks join table into `officeIds: string[]`
 * so the response shape matches the frontend's Staff interface.
 */
function toStaffShape(raw: { officeLinks: { officeId: string }[] } & Record<string, unknown>) {
  const { officeLinks, ...rest } = raw;
  return { ...rest, officeIds: officeLinks.map((l: { officeId: string }) => l.officeId) };
}

const LIST_INCLUDE = { officeLinks: { select: { officeId: true } } } as const;

const DETAIL_INCLUDE = {
  officeLinks: { select: { officeId: true } },
  shifts: true,
  absences: true,
  breaks: true,
} as const;

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, officeId?: string) {
    const rows = await this.prisma.staff.findMany({
      where: {
        tenantId,
        ...(officeId && { officeLinks: { some: { officeId } } }),
      },
      include: LIST_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toStaffShape);
  }

  async findOne(tenantId: string, id: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id, tenantId },
      include: DETAIL_INCLUDE,
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    return toStaffShape(staff);
  }

  async create(tenantId: string, dto: CreateStaffDto) {
    const row = await this.prisma.staff.create({
      data: {
        tenantId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        role: dto.role,
        isActive: dto.isActive ?? true,
        avatarUrl: dto.avatarUrl,
        ...(dto.officeIds?.length && {
          officeLinks: {
            createMany: { data: dto.officeIds.map(officeId => ({ officeId })) },
          },
        }),
      },
      include: LIST_INCLUDE,
    });
    return toStaffShape(row);
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    await this.findOne(tenantId, id);
    const row = await this.prisma.staff.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
        ...(dto.officeIds !== undefined && {
          officeLinks: {
            deleteMany: {},
            createMany: { data: dto.officeIds.map(officeId => ({ officeId })) },
          },
        }),
      },
      include: LIST_INCLUDE,
    });
    return toStaffShape(row);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.staff.delete({ where: { id } });
  }
}
