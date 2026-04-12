import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsPesel } from '../validators/pesel.validator';
import { CourseMode } from '@prisma/client';
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
  @Matches(/^\+48\d{9}$/)
  phone!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @IsPesel()
  pesel!: string;

  @Transform((p: TransformFnParams) => trimString(p))
  @Matches(/^\d{20}$/)
  pkkNumber!: string;

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

  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  offerItemCode!: string;

  @IsBoolean()
  acceptedTerms!: boolean;

  @IsBoolean()
  acceptedPrivacy!: boolean;

  @IsBoolean()
  acceptedSalesTerms!: boolean;

  @IsDateString()
  birthDate!: string;

  @IsEnum(CourseMode)
  courseMode!: CourseMode;

  @IsOptional()
  @Transform((p: TransformFnParams) => {
    if (typeof p.value !== 'string') return undefined;
    const value = p.value.trim();
    return value === '' ? undefined : value;
  })
  @IsDateString()
  courseStartDate?: string;

  @IsBoolean()
  hasOtherDrivingLicense!: boolean;

  @IsOptional()
  @Transform((p: TransformFnParams) =>
    typeof p.value === 'string' ? p.value.trim().toUpperCase() : '',
  )
  @IsString()
  @MaxLength(20)
  otherDrivingLicenseCategory?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MaxLength(64)
  otherDrivingLicenseNumber?: string;

  @IsBoolean()
  hasTramPermit!: boolean;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MaxLength(64)
  tramPermitNumber?: string;

  @IsBoolean()
  wantsCashPayment!: boolean;

  @IsBoolean()
  wantsInstallments!: boolean;

  @IsOptional()
  @IsBoolean()
  guardianSameAddress?: boolean;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsPesel()
  guardianPesel?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  guardianFirstName?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  guardianLastName?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => normalizePlPhoneToE164(p.value))
  @IsString()
  @MaxLength(16)
  @Matches(/^\+48\d{9}$/)
  guardianPhone?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  guardianAddressLine1?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MaxLength(120)
  guardianAddressLine2?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  guardianCity?: string;

  @IsOptional()
  @Transform((p: TransformFnParams) => trimString(p))
  @Matches(/^\d{2}-\d{3}$/)
  guardianPostalCode?: string;
}
