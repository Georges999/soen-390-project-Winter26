process.env.EXPO_PUBLIC_GOOGLE_API_KEY = 'test-key';
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
});