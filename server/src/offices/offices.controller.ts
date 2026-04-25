import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OfficesService } from './offices.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('offices')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('offices')
export class OfficesController {
  constructor(private readonly svc: OfficesService) {}

  @Get()
  @ApiOperation({ summary: 'List all offices for the current tenant' })
  findAll(@Request() req: AuthRequest) {
    return this.svc.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new office' })
  create(@Request() req: AuthRequest, @Body() dto: CreateOfficeDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateOfficeDto) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hard delete an office (cascades to all linked records)' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id);
  }
}
