import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('services')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('services')
export class ServicesController {
  constructor(private readonly svc: ServicesService) {}

  @Get()
  @ApiOperation({ summary: 'List services, optionally filtered by office' })
  findAll(@Request() req: AuthRequest, @Query('officeId') officeId?: string) {
    return this.svc.findAll(req.user.tenantId, officeId);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateServiceDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id);
  }
}
