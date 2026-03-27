import { getPoiApiRadius } from '../../src/screens/MapScreen';

describe('getPoiApiRadius', () => {
  it('returns fetchRadius when it is a finite number', () => {
    expect(getPoiApiRadius(1500, 'nearest', 1000)).toBe(1500);
  });

  it('returns radius in range mode when fetchRadius is not finite', () => {
    expect(getPoiApiRadius(undefined, 'range', 1200)).toBe(1200);
    expect(getPoiApiRadius(Number.NaN, 'range', 800)).toBe(800);
  });

  it('uses minimum 2000 in nearest mode when fetchRadius is not finite', () => {
    expect(getPoiApiRadius(undefined, 'nearest', 1000)).toBe(2000);
    expect(getPoiApiRadius(undefined, 'nearest', 2600)).toBe(2600);
  });
});
