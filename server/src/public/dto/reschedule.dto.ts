import { IsISO8601 } from 'class-validator';

export class RescheduleDto {
  @IsISO8601()
  newStartTime!: string;
}
