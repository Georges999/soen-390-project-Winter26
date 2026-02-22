import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useDirectionsRoute } from '../../src/hooks/useDirectionsRoute';

jest.mock('@mapbox/polyline', () => ({
  decode: jest.fn(() => [[45.4968, -73.5788], [45.4952, -73.5779]]),
}));

// Use stable references to avoid infinite re-render loops
const START = { latitude: 45.4968, longitude: -73.5788 };
const DEST = { latitude: 45.4952, longitude: -73.5779 };
const MAP_REF_NULL = { current: null };

const makeMapRef = () => ({ current: { fitToCoordinates: jest.fn() } });

const mockRouteResponse = (overrides = {}) => ({
  json: () =>
    Promise.resolve({
      routes: [
        {
          overview_polyline: { points: 'encoded' },
          legs: [
            {
              duration: { text: '5 mins', value: 300 },
              distance: { text: '400 m', value: 400 },
              steps: [],
              ...overrides.leg,
            },
          ],
          ...overrides.route,
        },
      ],
      ...overrides.response,
    }),
});

describe('useDirectionsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should return empty when no startCoord', () => {
    const { result } = renderHook(() =>
      useDirectionsRoute({
        startCoord: null,
        destCoord: DEST,
        mapRef: MAP_REF_NULL,
        mode: 'walking',
      }),
    );
    expect(result.current.routeCoords).toEqual([]);
    expect(result.current.routeInfo).toBeNull();
    expect(result.current.routeOptions).toEqual([]);
  });

  it('should return empty when no destCoord', () => {
    const { result } = renderHook(() =>
      useDirectionsRoute({
        startCoord: START,
        destCoord: null,
        mapRef: MAP_REF_NULL,
        mode: 'walking',
      }),
    );
    expect(result.current.routeCoords).toEqual([]);
  });

  it('should return empty when no mode', () => {
    const { result } = renderHook(() =>
      useDirectionsRoute({
        startCoord: START,
        destCoord: DEST,
        mapRef: MAP_REF_NULL,
        mode: null,
      }),
    );
    expect(result.current.routeCoords).toEqual([]);
  });

  it('should fetch route for walking mode', async () => {
    fetch.mockResolvedValueOnce(mockRouteResponse());

    const mapRef = makeMapRef();
    const props = { startCoord: START, destCoord: DEST, mapRef, mode: 'walking' };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => {
      expect(result.current.routeCoords.length).toBeGreaterThan(0);
    });
    expect(result.current.routeInfo.durationText).toBe('5 mins');
    expect(result.current.routeInfo.distanceText).toBe('400 m');
  });

  it('should handle empty routes response', async () => {
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ routes: [] }),
    });

    const props = { startCoord: START, destCoord: DEST, mapRef: MAP_REF_NULL, mode: 'walking' };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current.routeCoords).toEqual([]);
    expect(result.current.routeInfo).toBeNull();
  });

  it('should handle fetch error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const props = { startCoord: START, destCoord: DEST, mapRef: MAP_REF_NULL, mode: 'driving' };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current.routeCoords).toEqual([]);
  });

  it('should handle route without overview_polyline', async () => {
    fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          routes: [{ legs: [{ duration: { text: '5 mins' } }] }],
        }),
    });

    const props = { startCoord: START, destCoord: DEST, mapRef: MAP_REF_NULL, mode: 'walking' };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(result.current.routeCoords).toEqual([]);
  });

  it('should fetch transit route with alternatives', async () => {
    fetch.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          routes: [
            {
              overview_polyline: { points: 'encoded' },
              legs: [
                {
                  duration: { text: '20 mins', value: 1200 },
                  distance: { text: '5 km', value: 5000 },
                  steps: [
                    {
                      travel_mode: 'TRANSIT',
                      html_instructions: 'Take bus 24',
                      polyline: { points: 'abc' },
                      distance: { text: '3 km' },
                      duration: { text: '15 mins' },
                      end_location: { lat: 45.50, lng: -73.57 },
                      transit_details: {
                        line: { short_name: '24', name: 'Bus 24', vehicle: { type: 'BUS' } },
                        departure_stop: { name: 'Stop A' },
                        arrival_stop: { name: 'Stop B' },
                        departure_time: { text: '10:00' },
                        arrival_time: { text: '10:20' },
                        num_stops: 5,
                      },
                    },
                    {
                      travel_mode: 'WALKING',
                      html_instructions: 'Walk to destination',
                      polyline: { points: 'def' },
                      distance: { text: '200 m' },
                      duration: { text: '3 mins' },
                      end_location: { lat: 45.51, lng: -73.56 },
                    },
                  ],
                },
              ],
            },
            {
              overview_polyline: { points: 'encoded2' },
              legs: [
                {
                  duration: { text: '30 mins', value: 1800 },
                  distance: { text: '6 km', value: 6000 },
                  steps: [],
                },
              ],
            },
          ],
        }),
    });

    const mapRef = makeMapRef();
    const props = { startCoord: START, destCoord: DEST, mapRef, mode: 'transit', routeIndex: 0 };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => {
      expect(result.current.routeCoords.length).toBeGreaterThan(0);
    });
    expect(result.current.routeOptions.length).toBe(2);
    expect(result.current.routeInfo).not.toBeNull();
    expect(result.current.routeInfo.steps.length).toBeGreaterThan(0);
  });

  it('should use originOverride and destinationOverride', async () => {
    fetch.mockResolvedValueOnce(mockRouteResponse());

    const mapRef = makeMapRef();
    const props = {
      startCoord: null,
      destCoord: null,
      mapRef,
      mode: 'driving',
      originOverride: '45.496820,-73.578760',
      destinationOverride: '45.458360,-73.638150',
    };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => {
      expect(result.current.routeCoords.length).toBeGreaterThan(0);
    });
    expect(fetch.mock.calls[0][0]).toContain('45.496820');
    expect(fetch.mock.calls[0][0]).toContain('45.458360');
  });

  it('should include waypoints in URL', async () => {
    fetch.mockResolvedValueOnce(mockRouteResponse());

    const mapRef = makeMapRef();
    const WP = ['45.49,-73.58'];
    const props = { startCoord: START, destCoord: DEST, mapRef, mode: 'driving', waypoints: WP };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => {
      expect(result.current.routeCoords.length).toBeGreaterThan(0);
    });
    expect(fetch.mock.calls[0][0]).toContain('waypoints');
  });

  it('should not fitToRoute when fitToRoute is false', async () => {
    const fitFn = jest.fn();
    fetch.mockResolvedValueOnce(mockRouteResponse());

    const mapRef = { current: { fitToCoordinates: fitFn } };
    const props = { startCoord: START, destCoord: DEST, mapRef, mode: 'walking', fitToRoute: false };
    renderHook(() => useDirectionsRoute(props));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(fitFn).not.toHaveBeenCalled();
  });

  it('should use bicycling mode', async () => {
    fetch.mockResolvedValueOnce(mockRouteResponse());

    const mapRef = makeMapRef();
    const props = { startCoord: START, destCoord: DEST, mapRef, mode: 'bicycling' };
    const { result } = renderHook(() => useDirectionsRoute(props));

    await waitFor(() => {
      expect(result.current.routeCoords.length).toBeGreaterThan(0);
    });
    expect(fetch.mock.calls[0][0]).toContain('mode=bicycling');
  });
});
