import * as Location from 'expo-location';
import {
  requestLocationPermission,
  getUserCoords,
  watchUserCoords,
} from '../../src/services/locationService';

// Mock expo-location
jest.mock('expo-location');

describe('locationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestLocationPermission', () => {
    it('should return true when permission is granted', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });

      const result = await requestLocationPermission();

      expect(result).toBe(true);
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    it('should return false when permission is denied', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const result = await requestLocationPermission();

      expect(result).toBe(false);
    });

    it('should return false for undetermined status', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
      });

      const result = await requestLocationPermission();

      expect(result).toBe(false);
    });
  });

  describe('getUserCoords', () => {
    it('should return coordinates when permission is granted', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      Location.getCurrentPositionAsync.mockResolvedValue({
        coords: {
          latitude: 45.4973,
          longitude: -73.5789,
        },
      });

      const result = await getUserCoords();

      expect(result).toEqual({
        latitude: 45.4973,
        longitude: -73.5789,
      });
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.High,
      });
    });

    it('should return null when permission is denied', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const result = await getUserCoords();

      expect(result).toBeNull();
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('should handle errors when fetching location', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      Location.getCurrentPositionAsync.mockRejectedValue(
        new Error('Location unavailable')
      );

      await expect(getUserCoords()).rejects.toThrow('Location unavailable');
    });
  });

  describe('watchUserCoords', () => {
    it('should return null and not subscribe when permission denied', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
      const result = await watchUserCoords(() => {});
      expect(result).toBeNull();
      expect(Location.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should subscribe and call callback with coordinates', async () => {
      Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
      const fakeSubscription = { remove: jest.fn() };
      Location.watchPositionAsync.mockImplementation(async (opts, cb) => {
        // immediately invoke callback for test
        cb({ coords: { latitude: 1, longitude: 2 } });
        return fakeSubscription;
      });
      const cb = jest.fn();

      const result = await watchUserCoords(cb);
      expect(Location.watchPositionAsync).toHaveBeenCalledWith(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        expect.any(Function)
      );
      expect(cb).toHaveBeenCalledWith({ latitude: 1, longitude: 2 });
      expect(result).toBe(fakeSubscription);
    });
  });
});
