import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string, officeId?: string) {
    return this.prisma.service.findMany({
      where: {
        tenantId,
        ...(officeId && { officeId }),
      },
      include: { category: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
      include: { category: true },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  create(tenantId: string, dto: CreateServiceDto) {
    return this.prisma.service.create({
      data: {
        tenantId,
        officeId: dto.officeId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description ?? '',
        price: dto.price,
        duration: dto.duration,
        imageUrl: dto.imageUrl,
      },
      include: { category: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateServiceDto) {
    await this.findOne(tenantId, id);
    return this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.officeId !== undefined && { officeId: dto.officeId }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.duration !== undefined && { duration: dto.duration }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
      include: { category: true },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.service.delete({ where: { id } });
  }
}
