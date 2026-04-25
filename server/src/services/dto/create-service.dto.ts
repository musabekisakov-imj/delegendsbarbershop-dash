import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @IsString()
  officeId!: string;

  @IsString()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Price as a number — Prisma accepts Decimal-compatible number input. */
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  price!: number;

  /** Duration in minutes. */
  @IsInt()
  @Min(1)
  @Type(() => Number)
  duration!: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
