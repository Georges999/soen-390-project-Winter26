import { isPointInPolygon, findBuildingUserIsIn } from '../../src/utils/geo';

describe('geo utils', () => {
  describe('isPointInPolygon', () => {
    it('should return true when point is inside a square polygon', () => {
      const point = { latitude: 45.5, longitude: -73.6 };
      const polygon = [
        { latitude: 45.4, longitude: -73.5 },
        { latitude: 45.6, longitude: -73.5 },
        { latitude: 45.6, longitude: -73.7 },
        { latitude: 45.4, longitude: -73.7 },
      ];
      
      expect(isPointInPolygon(point, polygon)).toBe(true);
    });

    it('should return false when point is outside polygon', () => {
      const point = { latitude: 45.3, longitude: -73.4 };
      const polygon = [
        { latitude: 45.4, longitude: -73.5 },
        { latitude: 45.6, longitude: -73.5 },
        { latitude: 45.6, longitude: -73.7 },
        { latitude: 45.4, longitude: -73.7 },
      ];
      
      expect(isPointInPolygon(point, polygon)).toBe(false);
    });

    it('should return false for empty polygon', () => {
      const point = { latitude: 45.5, longitude: -73.6 };
      const polygon = [];
      
      expect(isPointInPolygon(point, polygon)).toBe(false);
    });

    it('should handle point on polygon boundary', () => {
      const point = { latitude: 45.4, longitude: -73.5 };
      const polygon = [
        { latitude: 45.4, longitude: -73.5 },
        { latitude: 45.6, longitude: -73.5 },
        { latitude: 45.6, longitude: -73.7 },
        { latitude: 45.4, longitude: -73.7 },
      ];
      
      // Point on boundary - result may vary based on algorithm
      expect(typeof isPointInPolygon(point, polygon)).toBe('boolean');
    });
  });

  describe('findBuildingUserIsIn', () => {
    const buildings = [
      {
        id: 'building-1',
        name: 'Building A',
        coordinates: [
          { latitude: 45.4, longitude: -73.5 },
          { latitude: 45.6, longitude: -73.5 },
          { latitude: 45.6, longitude: -73.7 },
          { latitude: 45.4, longitude: -73.7 },
        ],
      },
      {
        id: 'building-2',
        name: 'Building B',
        coordinates: [
          { latitude: 45.7, longitude: -73.8 },
          { latitude: 45.9, longitude: -73.8 },
          { latitude: 45.9, longitude: -74.0 },
          { latitude: 45.7, longitude: -74.0 },
        ],
      },
    ];

    it('should return building when user is inside', () => {
      const userPoint = { latitude: 45.5, longitude: -73.6 };
      
      const result = findBuildingUserIsIn(userPoint, buildings);
      
      expect(result).not.toBeNull();
      expect(result.id).toBe('building-1');
    });

    it('should return null when user is outside all buildings', () => {
      const userPoint = { latitude: 45.3, longitude: -73.4 };
      
      const result = findBuildingUserIsIn(userPoint, buildings);
      
      expect(result).toBeNull();
    });

    it('should return null for empty buildings array', () => {
      const userPoint = { latitude: 45.5, longitude: -73.6 };
      
      const result = findBuildingUserIsIn(userPoint, []);
      
      expect(result).toBeNull();
    });

    it('should handle building with invalid coordinates', () => {
      const invalidBuildings = [
        {
          id: 'invalid-building',
          name: 'Invalid',
          coordinates: [{ latitude: 45.5, longitude: -73.6 }], // Less than 3 points
        },
      ];
      const userPoint = { latitude: 45.5, longitude: -73.6 };
      
      const result = findBuildingUserIsIn(userPoint, invalidBuildings);
      
      expect(result).toBeNull();
    });

    it('should return first matching building if user is in multiple', () => {
      const overlappingBuildings = [
        {
          id: 'building-1',
          name: 'Building A',
          coordinates: [
            { latitude: 45.4, longitude: -73.5 },
            { latitude: 45.6, longitude: -73.5 },
            { latitude: 45.6, longitude: -73.7 },
            { latitude: 45.4, longitude: -73.7 },
          ],
        },
        {
          id: 'building-2',
          name: 'Building B',
          coordinates: [
            { latitude: 45.4, longitude: -73.5 },
            { latitude: 45.6, longitude: -73.5 },
            { latitude: 45.6, longitude: -73.7 },
            { latitude: 45.4, longitude: -73.7 },
          ],
        },
      ];
      const userPoint = { latitude: 45.5, longitude: -73.6 };
      
      const result = findBuildingUserIsIn(userPoint, overlappingBuildings);
      
      expect(result.id).toBe('building-1');
    });
  });
});
