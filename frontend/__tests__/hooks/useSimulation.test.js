import { renderHook, act } from '@testing-library/react-native';
import { useSimulation } from '../../src/hooks/useSimulation';

describe('useSimulation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not start simulation with empty routeCoords', () => {
    const { result } = renderHook(() => useSimulation({ routeCoords: [], onStart: jest.fn() }));
    act(() => result.current.startSim());
    expect(result.current.isSimulating).toBe(false);
    expect(result.current.simulatedCoord).toBeNull();
  });

  it('should start simulation and set first coord', () => {
    const coords = [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3 },
    ];
    const onStart = jest.fn();
    const { result } = renderHook(() => useSimulation({ routeCoords: coords, onStart }));

    act(() => result.current.startSim());

    expect(result.current.isSimulating).toBe(true);
    expect(result.current.simulatedCoord).toEqual(coords[0]);
    expect(onStart).toHaveBeenCalled();
  });

  it('should advance simulation on each interval tick', () => {
    const coords = [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
      { latitude: 3, longitude: 3 },
    ];
    const { result } = renderHook(() => useSimulation({ routeCoords: coords, onStart: jest.fn() }));

    act(() => result.current.startSim());
    expect(result.current.simulatedCoord).toEqual(coords[0]);

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.simulatedCoord).toEqual(coords[1]);

    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.simulatedCoord).toEqual(coords[2]);
  });

  it('should stop simulation when reaching end of route', () => {
    const coords = [
      { latitude: 1, longitude: 1 },
      { latitude: 2, longitude: 2 },
    ];
    const { result } = renderHook(() => useSimulation({ routeCoords: coords, onStart: jest.fn() }));

    act(() => result.current.startSim());
    // Advance past end
    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(1000));

    expect(result.current.isSimulating).toBe(false);
  });

  it('should toggle simulation on and off', () => {
    const coords = [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }];
    const { result } = renderHook(() => useSimulation({ routeCoords: coords, onStart: jest.fn() }));

    act(() => result.current.toggleSim());
    expect(result.current.isSimulating).toBe(true);

    act(() => result.current.toggleSim());
    expect(result.current.isSimulating).toBe(false);
  });

  it('should stop simulation manually', () => {
    const coords = [{ latitude: 1, longitude: 1 }, { latitude: 2, longitude: 2 }];
    const { result } = renderHook(() => useSimulation({ routeCoords: coords, onStart: jest.fn() }));

    act(() => result.current.startSim());
    expect(result.current.isSimulating).toBe(true);

    act(() => result.current.stopSim());
    expect(result.current.isSimulating).toBe(false);
  });
});
