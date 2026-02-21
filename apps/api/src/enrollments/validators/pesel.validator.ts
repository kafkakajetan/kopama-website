import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function isValidDate(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

function parsePeselDate(
  pesel: string,
): { year: number; month: number; day: number } | null {
  const yy = Number(pesel.slice(0, 2));
  const mm = Number(pesel.slice(2, 4));
  const dd = Number(pesel.slice(4, 6));

  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return null;
  let year: number;
  let month: number;

  if (mm >= 1 && mm <= 12) {
    year = 1900 + yy;
    month = mm;
  } else if (mm >= 21 && mm <= 32) {
    year = 2000 + yy;
    month = mm - 20;
  } else if (mm >= 41 && mm <= 52) {
    year = 2100 + yy;
    month = mm - 40;
  } else if (mm >= 61 && mm <= 72) {
    year = 2200 + yy;
    month = mm - 60;
  } else if (mm >= 81 && mm <= 92) {
    year = 1800 + yy;
    month = mm - 80;
  } else {
    return null;
  }

  return { year, month, day: dd };
}

function validatePeselChecksum(pesel: string): boolean {
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const digits = pesel.split('').map((c) => Number(c));
  if (digits.some((n) => Number.isNaN(n))) return false;

  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  const control = (10 - (sum % 10)) % 10;
  return control === digits[10];
}

@ValidatorConstraint({ name: 'isPesel', async: false })
export class IsPeselConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;

    const pesel = value.trim();
    if (!/^\d{11}$/.test(pesel)) return false;

    const date = parsePeselDate(pesel);
    if (!date) return false;

    if (!isValidDate(date.year, date.month, date.day)) return false;

    return validatePeselChecksum(pesel);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} musi być poprawnym numerem PESEL`;
  }
}

export function IsPesel(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPeselConstraint,
    });
  };
}
