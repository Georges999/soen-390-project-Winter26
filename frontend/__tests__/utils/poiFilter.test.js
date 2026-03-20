import { getDistanceMeters, filterPOIsByMode } from '../../src/utils/poiFilter';

describe('poiFilter utils', () => {
  const userCoord = { latitude: 45.5, longitude: -73.57 };

  const nearPoi = {
    id: 'near',
    name: 'Near POI',
    coords: { latitude: 45.5005, longitude: -73.57 },
  };

  const mediumPoi = {
    id: 'medium',
    name: 'Medium POI',
    coords: { latitude: 45.502, longitude: -73.57 },
  };

  const farPoi = {
    id: 'far',
    name: 'Far POI',
    coords: { latitude: 45.51, longitude: -73.57 },
  };

  describe('getDistanceMeters', () => {
    it('returns Infinity when "to" is missing', () => {
      expect(getDistanceMeters(userCoord, undefined)).toBe(
        Number.POSITIVE_INFINITY,
      );
    });

    it('returns Infinity when from or to is missing', () => {
      expect(getDistanceMeters(null, userCoord)).toBe(Number.POSITIVE_INFINITY);
      expect(getDistanceMeters(userCoord, null)).toBe(Number.POSITIVE_INFINITY);
    });

    it('returns 0 for identical coordinates', () => {
      expect(getDistanceMeters(userCoord, userCoord)).toBeCloseTo(0, 6);
    });

    it('returns a positive number for different coordinates', () => {
      const distance = getDistanceMeters(userCoord, nearPoi.coords);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('filterPOIsByMode', () => {
    it('returns [] when userCoord is missing', () => {
      const result = filterPOIsByMode({
        pois: [nearPoi, mediumPoi],
        userCoord: null,
        mode: 'nearest',
        nearestCount: 2,
      });

      expect(result).toEqual([]);
    });

    it('returns [] when pois is not an array', () => {
      const result = filterPOIsByMode({
        pois: { id: 'x' },
        userCoord,
        mode: 'nearest',
        nearestCount: 2,
      });

      expect(result).toEqual([]);
    });

    it('nearest mode returns the closest N POIs sorted by distance', () => {
      const result = filterPOIsByMode({
        pois: [farPoi, nearPoi, mediumPoi],
        userCoord,
        mode: 'nearest',
        nearestCount: 2,
      });

      expect(result).toHaveLength(2);
      expect(result.map((poi) => poi.id)).toEqual(['near', 'medium']);
      expect(result[0].distance).toBeLessThan(result[1].distance);
    });

    it('nearest mode returns all POIs when nearestCount exceeds list length', () => {
      const result = filterPOIsByMode({
        pois: [farPoi, nearPoi],
        userCoord,
        mode: 'nearest',
        nearestCount: 99,
      });

      expect(result).toHaveLength(2);
      expect(result.map((poi) => poi.id)).toEqual(['near', 'far']);
    });

    it('range mode returns only POIs within the radius', () => {
      const result = filterPOIsByMode({
        pois: [nearPoi, mediumPoi, farPoi],
        userCoord,
        mode: 'range',
        radius: 300,
      });

      expect(result.map((poi) => poi.id)).toEqual(['near', 'medium']);
    });

    it('range mode includes a POI exactly at the radius boundary', () => {
      const boundaryDistance = getDistanceMeters(userCoord, mediumPoi.coords);

      const result = filterPOIsByMode({
        pois: [nearPoi, mediumPoi, farPoi],
        userCoord,
        mode: 'range',
        radius: boundaryDistance,
      });

      expect(result.map((poi) => poi.id)).toEqual(['near', 'medium']);
    });

    it('ignores POIs missing coords', () => {
      const missingCoordsPoi = { id: 'missing', name: 'Missing Coords' };

      const result = filterPOIsByMode({
        pois: [missingCoordsPoi, nearPoi, farPoi],
        userCoord,
        mode: 'range',
        radius: 500,
      });

      expect(result.map((poi) => poi.id)).toEqual(['near']);
    });

    it('returns sorted POIs by distance in fallback/default mode', () => {
      const result = filterPOIsByMode({
        pois: [farPoi, mediumPoi, nearPoi],
        userCoord,
        mode: 'all',
      });

      expect(result.map((poi) => poi.id)).toEqual(['near', 'medium', 'far']);
      expect(result[0].distance).toBeLessThan(result[1].distance);
      expect(result[1].distance).toBeLessThan(result[2].distance);
    });

    it('returns all POIs sorted by distance when mode is undefined', () => {
      const result = filterPOIsByMode({
        pois: [farPoi, nearPoi, mediumPoi],
        userCoord,
      });

      expect(result.map((poi) => poi.id)).toEqual(['near', 'medium', 'far']);
    });
  });
});
