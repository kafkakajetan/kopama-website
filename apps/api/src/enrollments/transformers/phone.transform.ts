export function normalizePlPhoneToE164(input: unknown): string {
  let raw: string;

  if (typeof input === 'string') {
    raw = input;
  } else if (typeof input === 'number' && Number.isFinite(input)) {
    raw = String(Math.trunc(input));
  } else if (typeof input === 'bigint') {
    raw = input.toString();
  } else {
    return '';
  }

  let v = raw.trim();

  v = v.replace(/[()\s-]/g, '');

  if (v.startsWith('00')) v = `+${v.slice(2)}`;

  if (v.startsWith('+')) {
    const digits = v.slice(1).replace(/\D/g, '');
    return digits ? `+${digits}` : '';
  }

  const digitsOnly = v.replace(/\D/g, '');

  if (digitsOnly.length === 9) return `+48${digitsOnly}`;

  if (digitsOnly.startsWith('48') && digitsOnly.length === 11)
    return `+${digitsOnly}`;

  if (digitsOnly.length >= 7 && digitsOnly.length <= 15)
    return `+${digitsOnly}`;

  return '';
}
