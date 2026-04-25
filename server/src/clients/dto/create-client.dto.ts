import { IsArray, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateClientDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  /** Office IDs to link the client to on creation. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  officeIds?: string[];
}
