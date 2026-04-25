import {
  IsString,
  IsISO8601,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class PublicClientDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

  /**
   * Phone number — validated as an international number.
   * Lithuanian numbers (+370 XXXXXXXX) pass this check.
   * We use 'any' region so +1, +44, etc. also work for tourists.
   */
  @IsPhoneNumber()
  phone!: string;
}

export class CreatePublicAppointmentDto {
  @IsString()
  @IsNotEmpty()
  officeId!: string;

  @IsString()
  @IsNotEmpty()
  serviceId!: string;

  @IsString()
  @IsNotEmpty()
  staffId!: string;

  @IsISO8601()
  startTime!: string;

  @ValidateNested()
  @Type(() => PublicClientDto)
  client!: PublicClientDto;
}
