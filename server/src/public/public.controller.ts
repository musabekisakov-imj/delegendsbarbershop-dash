import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PublicService } from './public.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreatePublicAppointmentDto } from './dto/create-public-appointment.dto';

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
}
