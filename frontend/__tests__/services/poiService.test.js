process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
const { fetchNearbyPOIs } = require('../../src/services/poiService');

global.fetch = jest.fn();

describe('poiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  it('should return empty array on error (non-ok response)', async () => {
    fetch.mockResolvedValue({
      ok: false,
    });

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
  });

  it('should handle fetch throwing an error', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
  });

  it('should return POIs from API', async () => {
    const mockData = {
      status: 'OK',
      results: [
        {
          place_id: 'abc123',
          name: 'Coffee Shop',
          rating: 4.2,
          geometry: {
            location: {
              lat: 45.5,
              lng: -73.5,
            },
          },
          vicinity: '123 Main St',
        },
      ],
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('name', 'Coffee Shop');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when API status is not OK', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ZERO_RESULTS',
        results: [],
      }),
    });

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when the API returns OK without results', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
      }),
    });

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when the API key is missing', async () => {
    const previousKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    delete process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    jest.resetModules();
    const { fetchNearbyPOIs: fetchNearbyPOIsWithoutKey } = require('../../src/services/poiService');

    const result = await fetchNearbyPOIsWithoutKey({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();

    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = previousKey;
    jest.resetModules();
  });

  it('should set rating to null when POI has no rating', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'abc123',
            name: 'Coffee Shop',
            geometry: {
              location: { lat: 45.5, lng: -73.5 },
            },
            vicinity: '123 Main St',
          },
        ],
      }),
    });

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result[0].rating).toBeNull();
  });

  it('should return empty array when lng is null', async () => {
    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: null,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should return empty array when API status is not OK or ZERO_RESULTS', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'INVALID_REQUEST',
        error_message: 'Invalid location argument',
        results: [],
      }),
    });

    const result = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.5,
      radius: 1000,
      type: 'cafe',
    });

    expect(result).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('adds distance from origin when provided', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'dist-1',
            name: 'Cafe With Distance',
            rating: 4.4,
            geometry: { location: { lat: 45.5015, lng: -73.567 } },
            vicinity: '321 Distance Rd',
          },
        ],
      }),
    });

    const [poi] = await fetchNearbyPOIs({
      lat: 45.5,
      lng: -73.57,
      origin: { latitude: 45.5, longitude: -73.57 },
    });

    expect(typeof poi.distance).toBe('number');
    expect(poi.distance).toBeGreaterThan(0);
  });

  it('omits distance when origin is missing', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [
          {
            place_id: 'no-origin',
            name: 'Cafe Without Distance',
            geometry: { location: { lat: 45.6, lng: -73.6 } },
            vicinity: '987 No Origin Ln',
          },
        ],
      }),
    });

    const [poi] = await fetchNearbyPOIs({
      lat: 45.6,
      lng: -73.6,
    });

    expect(poi.distance).toBeUndefined();
  });
});
