import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPesel } from '../validators/pesel.validator';
import { normalizePlPhoneToE164 } from '../transformers/phone.transform';

function trimString(p: TransformFnParams): string {
  return typeof p.value === 'string' ? p.value.trim() : '';
}

export class CreateEnrollmentDto {
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform((p: TransformFnParams) => normalizePlPhoneToE164(p.value))
  @IsString()
  @MaxLength(16)
  // na start: tylko PL (+48 + 9 cyfr)
  @Matches(/^\+48\d{9}$/)
  phone!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsPesel()
  pesel!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  addressLine1!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressLine2?: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @Matches(/^\d{2}-\d{3}$/)
  postalCode!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  courseCategoryId!: string;

  @IsBoolean()
  acceptedTerms!: boolean;

  @IsBoolean()
  acceptedPrivacy!: boolean;
}