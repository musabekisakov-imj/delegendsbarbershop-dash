import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppointmentStatus, DayOfWeek } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';

/** Map JS Date.getDay() (0=Sunday) to Prisma DayOfWeek enum */
const JS_DAY_TO_ENUM: DayOfWeek[] = [
  DayOfWeek.sunday,
  DayOfWeek.monday,
  DayOfWeek.tuesday,
  DayOfWeek.wednesday,
  DayOfWeek.thursday,
  DayOfWeek.friday,
  DayOfWeek.saturday,
];

/** Parse "HH:mm" into total minutes from midnight */
function hhmm(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Format total minutes from midnight back to "HH:mm" */
function toHhmm(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

@Injectable()
export class PublicService implements OnModuleInit {
  private readonly logger = new Logger(PublicService.name);
  private readonly tenantId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {
    this.tenantId = this.config.get<string>('PUBLIC_TENANT_ID') ?? '';
  }

  onModuleInit() {
    if (!this.tenantId) {
      this.logger.error(
        'PUBLIC_TENANT_ID is not set. The /public endpoints will return 404 for all requests. ' +
        'Set this env var to the tenant ID of the customer-facing shop.',
      );
    }
  }

  /** Throws if tenantId is not configured — safe guard on every request. */
  private assertConfigured(): string {
    if (!this.tenantId) {
      throw new NotFoundException('Public booking is not configured for this server');
    }
    return this.tenantId;
  }

  // ─── Offices ──────────────────────────────────────────────────────────

  async getOffices() {
    const tenantId = this.assertConfigured();
    return this.prisma.office.findMany({
      where: { tenantId },
      select: { id: true, name: true, address: true, timezone: true },
      orderBy: { name: 'asc' },
    });
  }

  // ─── Services ─────────────────────────────────────────────────────────

  async getServices(officeId: string) {
    const tenantId = this.assertConfigured();

    await this.assertOfficeOwnership(tenantId, officeId);

    const rows = await this.prisma.service.findMany({
      where: { tenantId, officeId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    // Coerce Prisma Decimal → number for serialisation
    return rows.map(s => ({
      ...s,
      price: Number(s.price),
    }));
  }

  // ─── Staff ────────────────────────────────────────────────────────────

  async getStaff(officeId: string) {
    const tenantId = this.assertConfigured();

    await this.assertOfficeOwnership(tenantId, officeId);

    const rows = await this.prisma.staff.findMany({
      where: {
        tenantId,
        isActive: true,
        officeLinks: { some: { officeId } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isActive: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return rows;
  }

  // ─── Availability ─────────────────────────────────────────────────────

  async getAvailability(query: AvailabilityQueryDto): Promise<string[]> {
    const tenantId = this.assertConfigured();
    const { staffId, date, duration } = query;

    // 1. Confirm staff belongs to this tenant
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, tenantId, isActive: true },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    // 2. Resolve timezone from one of their offices (first one wins), fallback to Europe/Vilnius
    const officeLink = await this.prisma.staffOffice.findFirst({
      where: { staffId },
      include: { office: { select: { timezone: true } } },
    });
    const tz = officeLink?.office.timezone ?? 'Europe/Vilnius';

    // 3. Parse the requested date in the tenant's timezone.
    //    We work in "minutes since midnight" arithmetic — no heavy date library needed.
    const [year, month, day] = date.split('-').map(Number);

    // JS Date.getDay() for that local date
    const localDate = new Date(
      `${date}T00:00:00${tzOffsetStr(tz, new Date(`${date}T12:00:00`))}`,
    );
    // Fallback: if TZ offset calculation fails, use UTC getUTCDay mapped to date string
    const jsDay = localDate.getDay();
    const dayOfWeek = JS_DAY_TO_ENUM[jsDay];

    // 4. Get staff shift for this day
    const shift = await this.prisma.shift.findUnique({
      where: { staffId_dayOfWeek: { staffId, dayOfWeek } },
    });
    if (!shift) return [];

    // 5. Get breaks for this day
    const breaks = await this.prisma.break.findMany({
      where: { staffId, dayOfWeek },
    });

    // 6. Get existing appointments on this calendar date (start of day → end of day, tenant-local)
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        staffId,
        deletedAt: null,
        status: { notIn: [AppointmentStatus.cancelled, AppointmentStatus.no_show] },
        startTime: { gte: dayStart, lte: dayEnd },
      },
      select: { startTime: true, endTime: true },
    });

    // Convert appointments to minutes-since-midnight windows
    const bookedWindows = existingAppointments.map(a => ({
      start: a.startTime.getUTCHours() * 60 + a.startTime.getUTCMinutes(),
      end: a.endTime.getUTCHours() * 60 + a.endTime.getUTCMinutes(),
    }));

    // 7. Compute available windows = shift minus breaks
    const shiftStart = hhmm(shift.startTime);
    const shiftEnd = hhmm(shift.endTime);

    // Build break windows
    const breakWindows = breaks.map(b => ({
      start: hhmm(b.startTime),
      end: hhmm(b.endTime),
    }));

    // Available windows are the gaps in [shiftStart, shiftEnd] after removing breaks
    const freeWindows = subtractWindows(
      [{ start: shiftStart, end: shiftEnd }],
      breakWindows,
    );

    // 8. Generate candidate slots every 15 minutes within shift hours
    const slots: string[] = [];
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const isToday = date === todayStr;

    // Lead time: now + 60 minutes in minutes-since-midnight
    const nowMinutes = isToday ? now.getUTCHours() * 60 + now.getUTCMinutes() + 60 : -1;

    for (let candidate = shiftStart; candidate + duration <= shiftEnd; candidate += 15) {
      const candidateEnd = candidate + duration;

      // Must fit inside a free window
      const fitsInFreeWindow = freeWindows.some(
        w => candidate >= w.start && candidateEnd <= w.end,
      );
      if (!fitsInFreeWindow) continue;

      // Must not overlap any booked appointment (half-open: a.start < b.end && b.start < a.end)
      const hasConflict = bookedWindows.some(
        w => candidate < w.end && w.start < candidateEnd,
      );
      if (hasConflict) continue;

      // If today, exclude slots earlier than now + 60 min lead time
      if (isToday && candidate < nowMinutes) continue;

      slots.push(toHhmm(candidate));
    }

    return slots;
  }

  // ─── Book appointment ────────────────────────────────────────────────

  async createAppointment(dto: CreatePublicAppointmentDto) {
    const tenantId = this.assertConfigured();
    const { officeId, serviceId, staffId, startTime, client: clientInput } = dto;

    // 1. Validate service belongs to this tenant
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) throw new NotFoundException('Service not found');

    // 2. Validate office belongs to this tenant
    await this.assertOfficeOwnership(tenantId, officeId);

    // Service must belong to the requested office
    if (service.officeId !== officeId) {
      throw new BadRequestException('Service is not available at the requested office');
    }

    // 3. Validate staff belongs to this tenant and is linked to this office
    const staffOffice = await this.prisma.staffOffice.findFirst({
      where: { staffId, officeId },
      include: { staff: { select: { tenantId: true, isActive: true } } },
    });
    if (!staffOffice || staffOffice.staff.tenantId !== tenantId || !staffOffice.staff.isActive) {
      throw new NotFoundException('Staff member not available at this office');
    }

    // 4. Compute endTime from service.duration
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      throw new BadRequestException('startTime is not a valid ISO date');
    }
    const end = new Date(start.getTime() + service.duration * 60 * 1000);

    // 5. Cross-office conflict check — never allow override for public bookings
    const conflicts = await this.prisma.appointment.findMany({
      where: {
        staffId,
        deletedAt: null,
        status: { notIn: [AppointmentStatus.cancelled, AppointmentStatus.no_show] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
    });
    if (conflicts.length > 0) {
      throw new ConflictException('The selected time slot is no longer available');
    }

    // 6. Find or create client by (tenantId, phone) — phone is the primary identifier
    let client = await this.prisma.client.findFirst({
      where: { tenantId, phone: clientInput.phone, deletedAt: null },
    });

    if (client) {
      // Update any missing fields — don't overwrite existing ones
      const patch: Record<string, string> = {};
      if (!client.firstName) patch.firstName = clientInput.firstName;
      if (!client.lastName) patch.lastName = clientInput.lastName;
      if (!client.email) patch.email = clientInput.email;

      if (Object.keys(patch).length > 0) {
        client = await this.prisma.client.update({ where: { id: client.id }, data: patch });
      }

      // Ensure ClientOffice link exists
      await this.prisma.clientOffice.upsert({
        where: { clientId_officeId: { clientId: client.id, officeId } },
        create: { clientId: client.id, officeId },
        update: {},
      });
    } else {
      client = await this.prisma.client.create({
        data: {
          tenantId,
          firstName: clientInput.firstName,
          lastName: clientInput.lastName,
          email: clientInput.email,
          phone: clientInput.phone,
          notes: '',
          officeLinks: { create: { officeId } },
        },
      });
    }

    // 7. Create appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        locationId: officeId,
        clientId: client.id,
        staffId,
        serviceId,
        startTime: start,
        endTime: end,
        status: AppointmentStatus.scheduled,
        notes: '',
      },
      include: {
        service: true,
        staff: true,
        office: true,
        tenant: true,
      },
    });

    // 8. Fire-and-forget confirmation email
    this.email
      .sendBookingConfirmation({
        to: client.email,
        clientFirstName: client.firstName,
        serviceName: appointment.service.name,
        staffName: `${appointment.staff.firstName} ${appointment.staff.lastName}`,
        startTime: appointment.startTime,
        shopName: appointment.tenant.name,
        shopPhone: appointment.tenant.phone,
        officeName: appointment.office.name,
        officeAddress: appointment.office.address,
      })
      .catch(() => {
        this.logger.error(`Failed to send booking confirmation email to ${client!.email}`);
      });

    // 9. Return summary — no raw DB record exposure
    return {
      appointmentId: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceName: appointment.service.name,
      staffName: `${appointment.staff.firstName} ${appointment.staff.lastName}`,
      officeName: appointment.office.name,
      officeAddress: appointment.office.address,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private async assertOfficeOwnership(tenantId: string, officeId: string) {
    const office = await this.prisma.office.findFirst({ where: { id: officeId, tenantId } });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }
}

// ─── Utility: subtract break windows from free windows ────────────────────────

interface Window {
  start: number;
  end: number;
}

function subtractWindows(free: Window[], blocked: Window[]): Window[] {
  let result = [...free];
  for (const block of blocked) {
    const next: Window[] = [];
    for (const seg of result) {
      // No overlap
      if (block.end <= seg.start || block.start >= seg.end) {
        next.push(seg);
        continue;
      }
      // Left part before block
      if (seg.start < block.start) {
        next.push({ start: seg.start, end: block.start });
      }
      // Right part after block
      if (seg.end > block.end) {
        next.push({ start: block.end, end: seg.end });
      }
    }
    result = next;
  }
  return result;
}

/**
 * Produce a UTC offset string like "+02:00" for a given timezone + date.
 * Used to build an ISO timestamp that JavaScript can parse in the right zone.
 * If Intl.DateTimeFormat offset resolution fails, returns "Z".
 */
function tzOffsetStr(tz: string, at: Date): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(at);
    const offsetPart = parts.find(p => p.type === 'timeZoneName')?.value ?? '';
    // offsetPart is like "GMT+2" or "GMT+02:00"
    const match = offsetPart.match(/GMT([+-]\d{1,2}(?::\d{2})?)/);
    if (!match) return 'Z';
    const raw = match[1]; // e.g. "+2" or "+02:00"
    const [hPart, mPart = '00'] = raw.slice(1).split(':');
    const sign = raw[0];
    return `${sign}${hPart.padStart(2, '0')}:${mPart.padEnd(2, '0')}`;
  } catch {
    return 'Z';
  }
}
