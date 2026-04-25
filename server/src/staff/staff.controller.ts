import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('staff')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('staff')
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  @Get()
  @ApiOperation({ summary: 'List staff members, optionally filtered by office' })
  @ApiQuery({ name: 'officeId', required: false })
  findAll(@Request() req: AuthRequest, @Query('officeId') officeId?: string) {
    return this.svc.findAll(req.user.tenantId, officeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get staff member with shifts, absences, and breaks' })
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateStaffDto) {
    return this.svc.create(req.user.tenantId, dto);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.svc.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.svc.remove(req.user.tenantId, id);
  }
}
