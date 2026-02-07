import { renderHook, waitFor } from '@testing-library/react-native';
import { useDefaultStartMyLocation } from '../../src/hooks/useDefaultStartMyLocation';
import * as locationService from '../../src/services/locationService';

// Mock the location service
jest.mock('../../src/services/locationService');

describe('useDefaultStartMyLocation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should auto-fill "My location" when start is empty and permission granted', async () => {
    const mockCoords = { latitude: 45.4973, longitude: -73.5789 };
    locationService.getUserCoords.mockResolvedValue(mockCoords);

    const setStartText = jest.fn();
    const setHasLocationPerm = jest.fn();
    const setStartCoord = jest.fn();

    renderHook(() =>
      useDefaultStartMyLocation({
        startText: '',
        setStartText,
        setHasLocationPerm,
        setStartCoord,
      })
    );

    await waitFor(() => {
      expect(setStartText).toHaveBeenCalledWith('My location');
      expect(setStartCoord).toHaveBeenCalledWith(mockCoords);
      expect(setHasLocationPerm).toHaveBeenCalledWith(true);
    });
  });

  it('should not auto-fill if start text already exists', async () => {
    const setStartText = jest.fn();
    const setHasLocationPerm = jest.fn();
    const setStartCoord = jest.fn();

    renderHook(() =>
      useDefaultStartMyLocation({
        startText: 'Some Building',
        setStartText,
        setHasLocationPerm,
        setStartCoord,
      })
    );

    await waitFor(() => {
      expect(locationService.getUserCoords).not.toHaveBeenCalled();
      expect(setStartText).not.toHaveBeenCalled();
    });
  });

  it('should handle permission denied', async () => {
    locationService.getUserCoords.mockResolvedValue(null);

    const setStartText = jest.fn();
    const setHasLocationPerm = jest.fn();
    const setStartCoord = jest.fn();

    renderHook(() =>
      useDefaultStartMyLocation({
        startText: '',
        setStartText,
        setHasLocationPerm,
        setStartCoord,
      })
    );

    await waitFor(() => {
      expect(setHasLocationPerm).toHaveBeenCalledWith(false);
      expect(setStartText).not.toHaveBeenCalled();
      expect(setStartCoord).not.toHaveBeenCalled();
    });
  });

  it('should only auto-fill once', async () => {
    const mockCoords = { latitude: 45.4973, longitude: -73.5789 };
    locationService.getUserCoords.mockResolvedValue(mockCoords);

    const setStartText = jest.fn();
    const setHasLocationPerm = jest.fn();
    const setStartCoord = jest.fn();

    const { rerender } = renderHook(
      ({ startText }) =>
        useDefaultStartMyLocation({
          startText,
          setStartText,
          setHasLocationPerm,
          setStartCoord,
        }),
      { initialProps: { startText: '' } }
    );

    await waitFor(() => {
      expect(setStartText).toHaveBeenCalledTimes(1);
    });

    // Clear mocks and rerender
    jest.clearAllMocks();
    rerender({ startText: '' });

    // Should not call again
    await waitFor(() => {
      expect(setStartText).not.toHaveBeenCalled();
    });
  });

  it('should not call getUserCoords if startText is whitespace', async () => {
    const setStartText = jest.fn();
    const setHasLocationPerm = jest.fn();
    const setStartCoord = jest.fn();

    renderHook(() =>
      useDefaultStartMyLocation({
        startText: '   ',
        setStartText,
        setHasLocationPerm,
        setStartCoord,
      })
    );

    await waitFor(() => {
      expect(locationService.getUserCoords).not.toHaveBeenCalled();
    });
  });
});
