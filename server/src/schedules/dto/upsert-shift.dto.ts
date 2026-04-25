import { IsEnum, IsString, Matches } from 'class-validator';
import { DayOfWeek } from '@prisma/client';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertShiftDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm format' })
  endTime!: string;
}
