import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories for the current tenant' })
  findAll(@Request() req: AuthRequest) {
    return this.svc.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateCategoryDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id);
  }
}
