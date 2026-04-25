import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all appointments for the current tenant' })
  findAll(@Request() req: AuthRequest, @Query('officeId') officeId?: string) {
    return this.svc.findAll(req.user.tenantId, officeId);
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create + auto-send confirmation email' })
  create(@Request() req: AuthRequest, @Body() dto: CreateAppointmentDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel + auto-send cancellation email' })
  cancel(@Request() req: AuthRequest, @Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.svc.cancel(req.user.tenantId, id, body?.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete (deletedAt timestamp)' })
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.softDelete(req.user.tenantId, id);
  }

  @Post(':id/restore')
  restore(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.restore(req.user.tenantId, id);
  }
}
