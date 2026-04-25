import { IsOptional, IsString } from 'class-validator';

export class CreateOfficeDto {
  @IsString()
  name!: string;

  @IsString()
  address!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}
