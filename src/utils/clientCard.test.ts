import { normalizeClientCardValue } from './clientCard';

describe('normalizeClientCardValue', () => {
  it('removes spaces and other characters from the customer card QR value', () => {
    expect(normalizeClientCardValue('123 456 789')).toBe('123456789');
    expect(normalizeClientCardValue('NIF: 123456789')).toBe('123456789');
    expect(normalizeClientCardValue(' https://app/vizinho-plus/card?c=123456789 ')).toBe('123456789');
  });

  it('keeps the original 9-digit value when it is already clean', () => {
    expect(normalizeClientCardValue('987654321')).toBe('987654321');
  });
});
