import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  create(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: { tenantId, name: dto.name },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(tenantId, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    // Category is referenced by services with onDelete: Restrict.
    // Let Prisma surface the FK violation — don't hide it.
    return this.prisma.category.delete({ where: { id } });
  }
}
