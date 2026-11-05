import {displayUrl} from '~/modules/ads';

describe('displayUrl', () => {
  it.each([
    ['kestrel.example/qos', 'kestrel.example/qos'],
    ['https://www.lumen.example/4k/', 'lumen.example/4k'],
    ['  HTTP://Northwind.example  ', 'Northwind.example'],
  ])('shows %p as %p', (raw, shown) => {
    expect(displayUrl(raw)).toBe(shown);
  });

  it.each([
    [undefined],
    [''],
    ['   '],
    ['two words.example'],
    ['https://'],
    [`${'a'.repeat(40)}.example`],
  ])('drops %p', (raw) => {
    expect(displayUrl(raw)).toBeUndefined();
  });
});
