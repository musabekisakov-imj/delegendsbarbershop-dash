import { IsArray, IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsEnum(StaffRole)
  role!: StaffRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  /** Office IDs to link the staff member to on creation. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  officeIds?: string[];
}
