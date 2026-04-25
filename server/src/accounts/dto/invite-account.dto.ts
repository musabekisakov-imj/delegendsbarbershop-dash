import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { StaffRole } from '@prisma/client';

export class InviteAccountDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEnum(StaffRole)
  role!: StaffRole;

  /** Office IDs this account will have access to. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  officeIds?: string[];

  /** Link to an existing staff record. */
  @IsString()
  @IsOptional()
  staffId?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}
