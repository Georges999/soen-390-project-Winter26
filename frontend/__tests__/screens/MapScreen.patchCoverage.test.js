import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import * as locationService from '../../src/services/locationService';

const mockBuildAllRooms = jest.fn();
const mockGetFilteredRooms = jest.fn();
const mockCampuses = {
  sgw: {
    id: 'sgw',
    name: 'SGW',
    region: {
      latitude: 45.4973,
      longitude: -73.5789,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    buildings: [
      {
        id: 'sgw-hall',
        label: 'HB',
        name: 'Hall Building',
        description: 'Hall Building',
        coordinates: [
          { latitude: 45.497, longitude: -73.579 },
          { latitude: 45.497, longitude: -73.578 },
          { latitude: 45.498, longitude: -73.578 },
        ],
        amenities: {},
      },
    ],
  },
  loyola: {
    id: 'loyola',
    name: 'Loyola',
    region: {
      latitude: 45.4582,
      longitude: -73.6405,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    buildings: [
      {
        id: 've',
        label: 'VX',
        name: 'Vanier Extension',
        description: 'Vanier Extension',
        coordinates: [
          { latitude: 45.458, longitude: -73.641 },
          { latitude: 45.458, longitude: -73.64 },
          { latitude: 45.459, longitude: -73.64 },
        ],
        amenities: {},
      },
    ],
  },
};

const actualGeoUtils = jest.requireActual('../../src/utils/geoUtils');
const mockGetPolygonCenter = jest.fn((points) => actualGeoUtils.getPolygonCenter(points));

jest.mock('../../src/services/locationService');
jest.mock('../../src/utils/indoorMapUtils', () => ({
  buildAllRooms: (...args) => mockBuildAllRooms(...args),
  getFilteredRooms: (...args) => mockGetFilteredRooms(...args),
}));
jest.mock('../../src/data/campuses.json', () => ({
  __esModule: true,
  default: mockCampuses,
}));
jest.mock('../../src/utils/geoUtils', () => {
  const actual = jest.requireActual('../../src/utils/geoUtils');
  return {
    ...actual,
    getPolygonCenter: (...args) => mockGetPolygonCenter(...args),
  };
});

const MapScreen = require('../../src/screens/MapScreen').default;

globalThis.fetch = jest.fn(() =>
  Promise.resolve({
    json: () =>
      Promise.resolve({
        routes: [
          {
            overview_polyline: { points: 'abc' },
            legs: [
              {
                duration: { text: '5 mins', value: 300 },
                distance: { text: '400 m', value: 400 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: '<b>Walk north</b>',
                    polyline: { points: 'abc' },
                    distance: { text: '200 m' },
                    duration: { text: '2 mins' },
                    end_location: { lat: 45.498, lng: -73.579 },
                  },
                ],
              },
            ],
          },
        ],
      }),
  }),
);

async function focusAndType(input, text) {
  await act(async () => {
    fireEvent(input, 'focus');
  });
  await act(async () => {
    fireEvent.changeText(input, text);
  });
}

describe('MapScreen patch coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildAllRooms.mockReturnValue([]);
    mockGetFilteredRooms.mockReturnValue([]);
    mockGetPolygonCenter.mockImplementation((points) =>
      actualGeoUtils.getPolygonCenter(points),
    );
    locationService.getUserCoords.mockResolvedValue({
      latitude: 45.4973,
      longitude: -73.5789,
    });
    locationService.watchUserCoords.mockImplementation(() =>
      Promise.resolve({ remove: jest.fn() }),
    );
  });

  it('matches a room to a building by alias name when the label alias does not match', async () => {
    const room = {
      campusId: 'sgw',
      buildingId: 'hall',
      id: 'hall-room-1',
      label: 'H999',
      buildingName: 'Hall Building',
      floor: 'Hall-9',
    };

    mockBuildAllRooms.mockReturnValue([room]);
    mockGetFilteredRooms.mockReturnValue([room]);

    const { getByTestId, getByText } = render(<MapScreen />);

    await focusAndType(getByTestId('dest-input'), 'H999');
    await act(async () => {
      fireEvent.press(getByText('H999 · Hall Building'));
    });

    expect(getByTestId('dest-input').props.value).toBe('H999 · Hall Building');
  });

  it('falls back to matching by building id when campus-specific alias matching fails', async () => {
    const room = {
      campusId: 'unknown-campus',
      buildingId: 've',
      id: 've-room-1',
      label: 'VE123',
      buildingName: 'Vanier Extension',
      floor: 'VE-1',
    };

    mockBuildAllRooms.mockReturnValue([room]);
    mockGetFilteredRooms.mockReturnValue([room]);

    const { getByTestId, getByText } = render(<MapScreen />);

    await focusAndType(getByTestId('dest-input'), 'VE123');
    await act(async () => {
      fireEvent.press(getByText('VE123 · Vanier Extension'));
    });

    expect(getByTestId('dest-input').props.value).toBe('VE123 · Vanier Extension');
  });

  it('keeps the room query selected when no building center can be resolved', async () => {
    const room = {
      campusId: 'sgw',
      buildingId: 'hall',
      id: 'hall-room-2',
      label: 'H998',
      buildingName: 'Hall Building',
      floor: 'Hall-9',
    };

    mockBuildAllRooms.mockReturnValue([room]);
    mockGetFilteredRooms.mockReturnValue([room]);
    mockGetPolygonCenter.mockImplementation((points) => {
      if (points === mockCampuses.sgw.buildings[0].coordinates) {
        return null;
      }
      return actualGeoUtils.getPolygonCenter(points);
    });

    const { getByTestId, getByText, queryByTestId } = render(<MapScreen />);

    await focusAndType(getByTestId('dest-input'), 'H998');
    await act(async () => {
      fireEvent.press(getByText('H998 · Hall Building'));
    });

    expect(getByTestId('dest-input').props.value).toBe('H998');
    expect(queryByTestId('indoor-handoff-button')).toBeNull();
  });

  it('omits destinationRoom from indoor handoff when only the start room is selected', async () => {
    const room = {
      campusId: 'sgw',
      buildingId: 'hall',
      id: 'hall-room-3',
      label: 'H997',
      buildingName: 'Hall Building',
      floor: 'Hall-9',
    };
    const navigation = {
      navigate: jest.fn(),
    };

    mockBuildAllRooms.mockReturnValue([room]);
    mockGetFilteredRooms.mockReturnValue([room]);

    const { getByTestId, getByText } = render(<MapScreen navigation={navigation} />);

    await focusAndType(getByTestId('start-input'), 'H997');
    await act(async () => {
      fireEvent.press(getByText('H997 · Hall Building'));
    });

    await waitFor(() => {
      expect(getByTestId('indoor-handoff-button')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('indoor-handoff-button'));
    });

    expect(navigation.navigate).toHaveBeenCalledWith(
      'Indoor',
      expect.objectContaining({
        screen: 'IndoorDirections',
        params: expect.objectContaining({
          startRoom: expect.objectContaining({ label: 'H997' }),
        }),
      }),
    );
    expect(navigation.navigate.mock.calls[0][1].params.destinationRoom).toBeUndefined();
  });
});
