import { Injectable, NotFoundException } from '@nestjs/common';
import { DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertShiftDto } from './dto/upsert-shift.dto';
import { UpsertAbsenceDto } from './dto/upsert-absence.dto';
import { UpsertBreakDto } from './dto/upsert-break.dto';

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────

  /** Verify that the staffId belongs to the calling tenant. */
  private async assertStaffOwnership(tenantId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({ where: { id: staffId, tenantId } });
    if (!staff) throw new NotFoundException('Staff member not found');
  }

  // ─── Shifts ───────────────────────────────────────────────

  getShifts(tenantId: string, staffId: string) {
    return this.assertStaffOwnership(tenantId, staffId).then(() =>
      this.prisma.shift.findMany({ where: { staffId }, orderBy: { dayOfWeek: 'asc' } }),
    );
  }

  async upsertShift(tenantId: string, staffId: string, dto: UpsertShiftDto) {
    await this.assertStaffOwnership(tenantId, staffId);
    return this.prisma.shift.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek: dto.dayOfWeek } },
      create: { staffId, dayOfWeek: dto.dayOfWeek, startTime: dto.startTime, endTime: dto.endTime },
      update: { startTime: dto.startTime, endTime: dto.endTime },
    });
  }

  async removeShift(tenantId: string, staffId: string, dayOfWeek: DayOfWeek) {
    await this.assertStaffOwnership(tenantId, staffId);
    return this.prisma.shift.deleteMany({ where: { staffId, dayOfWeek } });
  }

  // ─── Absences ─────────────────────────────────────────────

  getAbsences(tenantId: string, staffId: string) {
    return this.assertStaffOwnership(tenantId, staffId).then(() =>
      this.prisma.absence.findMany({ where: { staffId } }),
    );
  }

  async upsertAbsence(tenantId: string, staffId: string, dto: UpsertAbsenceDto) {
    await this.assertStaffOwnership(tenantId, staffId);
    return this.prisma.absence.upsert({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek: dto.dayOfWeek } },
      create: { staffId, dayOfWeek: dto.dayOfWeek, reason: dto.reason },
      update: { reason: dto.reason },
    });
  }

  async removeAbsence(tenantId: string, staffId: string, dayOfWeek: DayOfWeek) {
    await this.assertStaffOwnership(tenantId, staffId);
    return this.prisma.absence.deleteMany({ where: { staffId, dayOfWeek } });
  }

  // ─── Breaks ───────────────────────────────────────────────

  getBreaks(tenantId: string, staffId: string) {
    return this.assertStaffOwnership(tenantId, staffId).then(() =>
      this.prisma.break.findMany({ where: { staffId } }),
    );
  }

  /**
   * Breaks don't have a unique constraint on (staffId, dayOfWeek) in the schema
   * — a staff member can have multiple breaks per day. We treat a PUT here as
   * "replace all breaks for this day" to match the upsert pattern the frontend
   * uses for shifts and absences.
   */
  async upsertBreak(tenantId: string, staffId: string, dto: UpsertBreakDto) {
    await this.assertStaffOwnership(tenantId, staffId);
    await this.prisma.break.deleteMany({ where: { staffId, dayOfWeek: dto.dayOfWeek } });
    return this.prisma.break.create({
      data: { staffId, dayOfWeek: dto.dayOfWeek, startTime: dto.startTime, endTime: dto.endTime, type: dto.type },
    });
  }

  async removeBreak(tenantId: string, staffId: string, dayOfWeek: DayOfWeek) {
    await this.assertStaffOwnership(tenantId, staffId);
    return this.prisma.break.deleteMany({ where: { staffId, dayOfWeek } });
  }
}
