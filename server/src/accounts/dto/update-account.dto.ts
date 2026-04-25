import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountStatus, StaffRole } from '@prisma/client';

export class UpdateAccountDto {
  @IsEnum(StaffRole)
  @IsOptional()
  role?: StaffRole;

  @IsEnum(AccountStatus)
  @IsOptional()
  status?: AccountStatus;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  officeIds?: string[];

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
