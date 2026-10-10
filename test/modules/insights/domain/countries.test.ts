import {COUNTRY_NAMES, countryName} from '~/modules/insights/domain/countries';

describe('countryName', () => {
  it.each([
    ['DE', 'Germany'],
    ['de', 'Germany'],
    ['US', 'United States'],
    ['GB', 'United Kingdom'],
    ['UA', 'Ukraine'],
  ])('%s → %s', (code, name) => {
    expect(countryName(code)).toBe(name);
  });

  it('falls back to the upper-cased code when unknown', () => {
    expect(countryName('xx')).toBe('XX');
  });

  it('holds every ISO 3166-1 alpha-2 code', () => {
    expect(Object.keys(COUNTRY_NAMES)).toHaveLength(249);
    for (const code of Object.keys(COUNTRY_NAMES)) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });
});
