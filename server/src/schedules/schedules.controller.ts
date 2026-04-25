import { Body, Controller, Delete, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DayOfWeek } from '@prisma/client';
import { SchedulesService } from './schedules.service';
import { UpsertShiftDto } from './dto/upsert-shift.dto';
import { UpsertAbsenceDto } from './dto/upsert-absence.dto';
import { UpsertBreakDto } from './dto/upsert-break.dto';

interface AuthRequest extends Request {
  user: { id: string; tenantId: string; role: string; email: string };
}

@ApiTags('schedules')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('staff/:staffId')
export class SchedulesController {
  constructor(private readonly svc: SchedulesService) {}

  // ─── Shifts ───────────────────────────────────────────────

  @Get('shifts')
  @ApiOperation({ summary: "Get all shifts for a staff member" })
  getShifts(@Request() req: AuthRequest, @Param('staffId') staffId: string) {
    return this.svc.getShifts(req.user.tenantId, staffId);
  }

  @Put('shifts/:dayOfWeek')
  @ApiOperation({ summary: 'Upsert a shift for a specific day' })
  upsertShift(
    @Request() req: AuthRequest,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body() dto: UpsertShiftDto,
  ) {
    // dayOfWeek in the route and dto must agree — we use the route param as canonical.
    dto.dayOfWeek = dayOfWeek;
    return this.svc.upsertShift(req.user.tenantId, staffId, dto);
  }

  @Delete('shifts/:dayOfWeek')
  @ApiOperation({ summary: 'Remove a shift for a specific day' })
  removeShift(
    @Request() req: AuthRequest,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
  ) {
    return this.svc.removeShift(req.user.tenantId, staffId, dayOfWeek);
  }

  // ─── Absences ─────────────────────────────────────────────

  @Get('absences')
  @ApiOperation({ summary: "Get all absences for a staff member" })
  getAbsences(@Request() req: AuthRequest, @Param('staffId') staffId: string) {
    return this.svc.getAbsences(req.user.tenantId, staffId);
  }

  @Put('absences/:dayOfWeek')
  @ApiOperation({ summary: 'Upsert an absence for a specific day' })
  upsertAbsence(
    @Request() req: AuthRequest,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body() dto: UpsertAbsenceDto,
  ) {
    dto.dayOfWeek = dayOfWeek;
    return this.svc.upsertAbsence(req.user.tenantId, staffId, dto);
  }

  @Delete('absences/:dayOfWeek')
  @ApiOperation({ summary: 'Remove an absence for a specific day' })
  removeAbsence(
    @Request() req: AuthRequest,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
  ) {
    return this.svc.removeAbsence(req.user.tenantId, staffId, dayOfWeek);
  }

  // ─── Breaks ───────────────────────────────────────────────

  @Get('breaks')
  @ApiOperation({ summary: "Get all breaks for a staff member" })
  getBreaks(@Request() req: AuthRequest, @Param('staffId') staffId: string) {
    return this.svc.getBreaks(req.user.tenantId, staffId);
  }

  @Put('breaks/:dayOfWeek')
  @ApiOperation({ summary: 'Upsert a break for a specific day (replaces existing break for that day)' })
  upsertBreak(
    @Request() req: AuthRequest,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
    @Body() dto: UpsertBreakDto,
  ) {
    dto.dayOfWeek = dayOfWeek;
    return this.svc.upsertBreak(req.user.tenantId, staffId, dto);
  }

  @Delete('breaks/:dayOfWeek')
  @ApiOperation({ summary: 'Remove all breaks for a specific day' })
  removeBreak(
    @Request() req: AuthRequest,
    @Param('staffId') staffId: string,
    @Param('dayOfWeek') dayOfWeek: DayOfWeek,
  ) {
    return this.svc.removeBreak(req.user.tenantId, staffId, dayOfWeek);
  }
}
