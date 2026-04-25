import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('clients')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('clients')
export class ClientsController {
  constructor(private readonly svc: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'List clients — excludes archived by default' })
  @ApiQuery({ name: 'officeId', required: false })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  findAll(
    @Request() req: AuthRequest,
    @Query('officeId') officeId?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.svc.findAll(req.user.tenantId, officeId, includeArchived === 'true');
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateClientDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a client (sets deletedAt)' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.softDelete(req.user.tenantId, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted client' })
  restore(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.restore(req.user.tenantId, id);
  }
}
