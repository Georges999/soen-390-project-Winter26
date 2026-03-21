import { renderHook, waitFor } from '@testing-library/react-native';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import * as locationService from '../../src/services/locationService';

jest.mock('../../src/services/locationService');

describe('useUserLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds userCoord from a single fetch before watch updates', async () => {
    const initial = { latitude: 10, longitude: 20 };
    const live = { latitude: 11, longitude: 21 };
    locationService.getUserCoords.mockResolvedValue(initial);
    locationService.watchUserCoords.mockImplementation((cb) => {
      cb(live);
      return Promise.resolve({ remove: jest.fn() });
    });

    const setHasLocationPerm = jest.fn();
    const { result } = renderHook(() => useUserLocation({ setHasLocationPerm }));

    await waitFor(() => {
      expect(result.current.userCoord).toEqual(live);
      expect(setHasLocationPerm).toHaveBeenCalledWith(true);
    });
  });
});
