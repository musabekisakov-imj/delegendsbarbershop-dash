import { IsString, IsDateString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class CreateAppointmentDto {
  @IsString()
  clientId!: string;

  @IsString()
  staffId!: string;

  @IsString()
  serviceId!: string;

  @IsString()
  locationId!: string;

  @IsDateString()
  startTime!: string;

  @IsDateString()
  endTime!: string;

  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  /** Set true to bypass cross-office conflict detection (owner/manager only). */
  @IsBoolean()
  @IsOptional()
  override?: boolean;
}
