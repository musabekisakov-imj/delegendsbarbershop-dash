import { IsEmail, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { Language, Theme } from '@prisma/client';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Theme)
  @IsOptional()
  theme?: Theme;

  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  /** Map of day → { isOpen: boolean; openTime: string; closeTime: string } */
  @IsObject()
  @IsOptional()
  workingHours?: Record<string, { isOpen: boolean; openTime: string; closeTime: string }>;
}
