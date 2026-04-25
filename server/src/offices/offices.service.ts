import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.office.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const office = await this.prisma.office.findFirst({ where: { id, tenantId } });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  create(tenantId: string, dto: CreateOfficeDto) {
    return this.prisma.office.create({
      data: { tenantId, ...dto },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateOfficeDto) {
    await this.findOne(tenantId, id);
    return this.prisma.office.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Cascade deletes (accountLinks, staffLinks, clientLinks, services,
    // appointments) are handled by the schema's onDelete: Cascade.
    return this.prisma.office.delete({ where: { id } });
  }
}
