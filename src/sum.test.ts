import { describe, it, expect } from 'vitest';

import { sum } from './sum';

describe('sum', () => {
  it('adds positive numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });

  it('adds negative numbers', () => {
    expect(sum(-1, -2)).toBe(-3);
  });

  it('adds zeros', () => {
    expect(sum(0, 0)).toBe(0);
  });
});
