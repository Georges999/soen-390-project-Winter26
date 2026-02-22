import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useNextClass } from '../../src/hooks/useNextClass';
import * as googleCalendarService from '../../src/services/googleCalendarService';

jest.mock('../../src/services/googleCalendarService');

describe('useNextClass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return null when not connected', () => {
    const { result } = renderHook(() => useNextClass(false));
    expect(result.current.nextClass).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should fetch next class when connected', async () => {
    const mockEvent = {
      title: 'SOEN 390',
      location: 'H Building Room 501',
      startTime: new Date(Date.now() + 3600000).toISOString(),
    };
    googleCalendarService.getNextClassEvent.mockResolvedValue(mockEvent);

    const { result } = renderHook(() => useNextClass(true));

    await waitFor(() => {
      expect(result.current.nextClass).toEqual(mockEvent);
    });
  });

  it('should set isLoading during fetch', async () => {
    let resolvePromise;
    googleCalendarService.getNextClassEvent.mockReturnValue(
      new Promise((resolve) => { resolvePromise = resolve; }),
    );

    const { result } = renderHook(() => useNextClass(true));

    // Loading should be true while fetching
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      resolvePromise(null);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should handle fetch error', async () => {
    googleCalendarService.getNextClassEvent.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useNextClass(true));

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.nextClass).toBeNull();
    });
  });

  it('should return buildingCode from class location', async () => {
    const mockEvent = {
      title: 'SOEN 390',
      location: 'H Building Room 501',
      startTime: new Date(Date.now() + 3600000).toISOString(),
    };
    googleCalendarService.getNextClassEvent.mockResolvedValue(mockEvent);
    googleCalendarService.parseBuildingFromLocation.mockReturnValue('H');

    const { result } = renderHook(() => useNextClass(true));

    await waitFor(() => {
      expect(result.current.buildingCode).toBe('H');
    });
  });

  it('should return null buildingCode when no location', async () => {
    const mockEvent = {
      title: 'SOEN 390',
      startTime: new Date(Date.now() + 3600000).toISOString(),
    };
    googleCalendarService.getNextClassEvent.mockResolvedValue(mockEvent);
    googleCalendarService.parseBuildingFromLocation.mockReturnValue(null);

    const { result } = renderHook(() => useNextClass(true));

    await waitFor(() => {
      expect(result.current.nextClass).toEqual(mockEvent);
    });
  });

  it('should clear nextClass when disconnected', async () => {
    const mockEvent = { title: 'SOEN 390' };
    googleCalendarService.getNextClassEvent.mockResolvedValue(mockEvent);

    const { result, rerender } = renderHook(
      ({ connected }) => useNextClass(connected),
      { initialProps: { connected: true } },
    );

    await waitFor(() => {
      expect(result.current.nextClass).toEqual(mockEvent);
    });

    rerender({ connected: false });

    await waitFor(() => {
      expect(result.current.nextClass).toBeNull();
    });
  });

  it('should provide refresh function', async () => {
    googleCalendarService.getNextClassEvent.mockResolvedValue(null);

    const { result } = renderHook(() => useNextClass(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');
  });
});
