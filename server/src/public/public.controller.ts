import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';
import { NewsletterDto } from './dto/newsletter.dto';
import { RescheduleDto } from './dto/reschedule.dto';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Get('offices')
  @ApiOperation({ summary: 'List all offices for the public tenant' })
  getOffices() {
    return this.svc.getOffices();
  }

  @Get('services')
  @ApiOperation({ summary: 'List services available at an office' })
  @ApiQuery({ name: 'officeId', required: true })
  getServices(@Query('officeId') officeId: string) {
    return this.svc.getServices(officeId);
  }

  @Get('staff')
  @ApiOperation({ summary: 'List active staff at an office (public-safe fields only)' })
  @ApiQuery({ name: 'officeId', required: true })
  getStaff(@Query('officeId') officeId: string) {
    return this.svc.getStaff(officeId);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Get available slot start times for a staff member on a given date' })
  getAvailability(@Query() query: AvailabilityQueryDto) {
    return this.svc.getAvailability(query);
  }

  @Get('availability/today')
  @ApiOperation({
    summary: "Aggregate: today's slots for every active staff member at one office",
  })
  @ApiQuery({ name: 'officeId', required: true })
  @ApiQuery({ name: 'duration', required: false, description: 'Slot duration in minutes (default 30)' })
  getTodayAvailability(
    @Query('officeId') officeId: string,
    @Query('duration') duration?: string,
  ) {
    const minutes = duration ? Math.max(15, Math.min(240, Number(duration))) : 30;
    return this.svc.getTodayAvailability(officeId, minutes);
  }

  /**
   * Stricter rate limit on the booking endpoint — 10 requests per minute per IP.
   * This sits on top of the global 100/min ThrottlerGuard already registered.
   */
  @Post('appointments')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Create a booking (anonymous — no auth required)' })
  createAppointment(@Body() dto: CreatePublicAppointmentDto) {
    return this.svc.createAppointment(dto);
  }

  /**
   * Manage-my-booking lookup — fed by the UUID in the confirmation email.
   * Knowing the ID is the only authentication; IDs are 36-char UUIDs and
   * the global Throttler caps brute-force attempts.
   */
  @Get('appointments/:id')
  @ApiOperation({ summary: 'Look up a booking by ID for the manage page' })
  @ApiParam({ name: 'id', description: 'Appointment UUID from the confirmation email' })
  getAppointment(@Param('id') id: string) {
    return this.svc.getAppointment(id);
  }

  @Post('appointments/:id/cancel')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Cancel a booking (must be ≥2h before start)' })
  cancelAppointment(@Param('id') id: string) {
    return this.svc.cancelAppointment(id);
  }

  @Patch('appointments/:id')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reschedule a booking — same service/staff, new time' })
  rescheduleAppointment(@Param('id') id: string, @Body() dto: RescheduleDto) {
    return this.svc.rescheduleAppointment(id, dto.newStartTime);
  }

  /**
   * Newsletter signup. Idempotent — re-subscribing the same email is a no-op.
   * Heavily rate-limited because the endpoint is unauthenticated.
   */
  @Post('newsletter')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Subscribe an email to the newsletter audience' })
  subscribeNewsletter(@Body() dto: NewsletterDto) {
    return this.svc.subscribeNewsletter(dto.email);
  }
}
