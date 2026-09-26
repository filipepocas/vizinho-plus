export const normalizeClientCardValue = (value: string): string => {
  if (value === null || value === undefined) return '';

  const digitsOnly = String(value).replace(/\D/g, '');
  if (!digitsOnly) return '';

  const nineDigitMatch = digitsOnly.match(/\d{9}/);
  if (nineDigitMatch) return nineDigitMatch[0];

  return digitsOnly.slice(-9);
};

export const formatClientCardValue = (value: string): string => {
  const normalized = normalizeClientCardValue(value);
  if (!normalized) return '';

  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6) return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;

  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)}`;
};
