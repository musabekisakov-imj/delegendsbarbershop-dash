import { IsEnum } from 'class-validator';
import { AbsenceReason, DayOfWeek } from '@prisma/client';

export class UpsertAbsenceDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsEnum(AbsenceReason)
  reason!: AbsenceReason;
}
