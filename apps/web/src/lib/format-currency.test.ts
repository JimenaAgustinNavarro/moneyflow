import { describe, expect, it } from 'vitest';

import { formatCurrency } from './format-currency';

describe('formatCurrency', () => {
  it('formatea PEN con agrupación y dos decimales', () => {
    expect(formatCurrency('1000')).toBe('S/ 1,000.00');
  });

  it('permite elegir otra moneda y normaliza espacios no separables', () => {
    expect(formatCurrency('25.5', 'USD')).toContain('25.50');
    expect(formatCurrency('25.5', 'USD')).not.toContain('\u00a0');
  });
});
