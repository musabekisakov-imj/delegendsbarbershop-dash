import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * List all non-deleted appointments for a tenant, optionally scoped to
   * an office. Includes related client/staff/service for the frontend's
   * AppointmentWithDetails type.
   */
  findAll(tenantId: string, officeId?: string) {
    return this.prisma.appointment.findMany({
      where: {
        tenantId,
        ...(officeId && { locationId: officeId }),
        deletedAt: null,
      },
      include: { client: true, staff: true, service: true },
      orderBy: { startTime: 'asc' },
    });
  }

  findOne(tenantId: string, id: string) {
    return this.prisma.appointment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { client: true, staff: true, service: true },
    });
  }

  /**
   * Create + cross-office conflict check + send confirmation email.
   * The conflict check looks across ALL offices for the same staff —
   * a barber can't be in two places at once.
   */
  async create(tenantId: string, dto: CreateAppointmentDto) {
    if (new Date(dto.startTime) >= new Date(dto.endTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    if (!dto.override) {
      const conflicts = await this.findConflicts(dto.staffId, new Date(dto.startTime), new Date(dto.endTime));
      if (conflicts.length > 0) {
        throw new ConflictException({
          code: 'BOOKING_CONFLICT',
          conflicts: conflicts.map(c => ({
            id: c.id,
            startTime: c.startTime,
            endTime: c.endTime,
            office: { id: c.office.id, name: c.office.name, address: c.office.address },
          })),
        });
      }
    }

    const created = await this.prisma.appointment.create({
      data: {
        tenantId,
        clientId: dto.clientId,
        staffId: dto.staffId,
        serviceId: dto.serviceId,
        locationId: dto.locationId,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        status: dto.status ?? AppointmentStatus.scheduled,
        notes: dto.notes ?? '',
      },
      include: { client: true, staff: true, service: true, office: true, tenant: true },
    });

    // Fire-and-forget: send confirmation email. Failure to send doesn't
    // block the booking (the appointment is already saved).
    this.email
      .sendBookingConfirmation({
        to: created.client.email,
        clientFirstName: created.client.firstName,
        serviceName: created.service.name,
        staffName: `${created.staff.firstName} ${created.staff.lastName}`,
        startTime: created.startTime,
        shopName: created.tenant.name,
        shopPhone: created.tenant.phone,
        officeName: created.office.name,
        officeAddress: created.office.address,
      })
      .catch(() => {/* logged inside email.service */});

    return created;
  }

  /**
   * Cross-office conflict detection — staff cannot be in two places.
   * Half-open interval overlap: a.start < b.end && b.start < a.end.
   */
  async findConflicts(staffId: string, start: Date, end: Date, excludeId?: string) {
    return this.prisma.appointment.findMany({
      where: {
        staffId,
        deletedAt: null,
        status: { notIn: [AppointmentStatus.cancelled, AppointmentStatus.no_show] },
        ...(excludeId && { id: { not: excludeId } }),
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: { office: true },
    });
  }

  /**
   * Soft-delete: marks deletedAt instead of hard removal. Sends
   * cancellation email to the client.
   */
  async cancel(tenantId: string, id: string, reason?: string) {
    const apt = await this.prisma.appointment.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { client: true, service: true, tenant: true },
    });
    if (!apt) throw new NotFoundException('Appointment not found');

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.cancelled },
    });

    this.email
      .sendBookingCancellation({
        to: apt.client.email,
        clientFirstName: apt.client.firstName,
        serviceName: apt.service.name,
        startTime: apt.startTime,
        shopName: apt.tenant.name,
        shopPhone: apt.tenant.phone,
        reason,
      })
      .catch(() => {/* logged inside email.service */});

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    const apt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');
    return this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(tenantId: string, id: string) {
    const apt = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!apt) throw new NotFoundException('Appointment not found');
    return this.prisma.appointment.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
