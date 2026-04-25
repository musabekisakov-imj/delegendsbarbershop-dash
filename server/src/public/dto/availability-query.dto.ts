import { IsString, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityQueryDto {
  @IsString()
  staffId!: string;

  /** Calendar date in YYYY-MM-DD format */
  @IsDateString()
  date!: string;

  /** Appointment duration in minutes */
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(480)
  duration!: number;
}
