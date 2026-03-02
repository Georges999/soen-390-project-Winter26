import { getPolygonCenter, distanceMeters, buildDotCoords } from '../../src/utils/geoUtils';

describe('geoUtils', () => {
  describe('getPolygonCenter', () => {
    it('returns null for empty array', () => {
      expect(getPolygonCenter([])).toBeNull();
    });

    it('calculates average correctly', () => {
      const points = [
        { latitude: 0, longitude: 0 },
        { latitude: 10, longitude: 10 },
      ];
      expect(getPolygonCenter(points)).toEqual({ latitude: 5, longitude: 5 });
    });
  });

  describe('distanceMeters', () => {
    it('returns Infinity if either point missing', () => {
      expect(distanceMeters(null, { latitude: 0, longitude: 0 })).toBe(Infinity);
      expect(distanceMeters({ latitude: 0, longitude: 0 }, null)).toBe(Infinity);
    });

    it('calculates known distance (approx)', () => {
      const a = { latitude: 0, longitude: 0 };
      const b = { latitude: 0, longitude: 1 };
      const d = distanceMeters(a, b);
      // about 111 km
      expect(d).toBeGreaterThan(100000);
      expect(d).toBeLessThan(112000);
    });
  });

  describe('buildDotCoords', () => {
    it('returns empty for invalid input', () => {
      expect(buildDotCoords(null)).toEqual([]);
      expect(buildDotCoords([])).toEqual([]);
      expect(buildDotCoords([{ latitude: 0, longitude: 0 }])).toEqual([]);
    });

    it('generates dots along straight line', () => {
      const coords = [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0.001 },
      ];
      const dots = buildDotCoords(coords, 10); // 10 meters spacing
      expect(dots.length).toBeGreaterThan(0);
      // all dots should lie between start and end
      dots.forEach(dot => {
        expect(dot.latitude).toBe(0);
        expect(dot.longitude).toBeGreaterThanOrEqual(0);
        expect(dot.longitude).toBeLessThanOrEqual(0.001);
      });
    });

    it('skips segments with zero length', () => {
      const coords = [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 0 },
        { latitude: 1, longitude: 1 },
      ];
      const dots = buildDotCoords(coords, 1);
      expect(dots.length).toBeGreaterThan(0);
    });
  });
});