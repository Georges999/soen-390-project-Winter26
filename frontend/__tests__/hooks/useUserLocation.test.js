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

  it('sets location perm to false when watchUserCoords throws', async () => {
    locationService.getUserCoords.mockResolvedValue(null);
    locationService.watchUserCoords.mockRejectedValue(new Error('Location denied'));

    const setHasLocationPerm = jest.fn();
    renderHook(() => useUserLocation({ setHasLocationPerm }));

    await waitFor(() => {
      expect(setHasLocationPerm).toHaveBeenCalledWith(false);
    });
  });

  it('sets location perm to false when subscription is null', async () => {
    locationService.getUserCoords.mockResolvedValue(null);
    locationService.watchUserCoords.mockResolvedValue(null);

    const setHasLocationPerm = jest.fn();
    renderHook(() => useUserLocation({ setHasLocationPerm }));

    await waitFor(() => {
      expect(setHasLocationPerm).toHaveBeenCalledWith(false);
    });
  });

  it('calls remove on subscription during cleanup', async () => {
    const removeFn = jest.fn();
    locationService.getUserCoords.mockResolvedValue(null);
    locationService.watchUserCoords.mockResolvedValue({ remove: removeFn });

    const setHasLocationPerm = jest.fn();
    const { unmount } = renderHook(() => useUserLocation({ setHasLocationPerm }));

    await waitFor(() => expect(locationService.watchUserCoords).toHaveBeenCalled());
    unmount();
    expect(removeFn).toHaveBeenCalled();
  });
});
