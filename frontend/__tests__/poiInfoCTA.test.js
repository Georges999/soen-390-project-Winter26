import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen, {
  handlePoiInfoCtaLogic,
  getPoiInfoCardBottomOffset,
  handleRecenterPressLogic,
} from '../src/screens/MapScreen';
import * as locationService from '../src/services/locationService';
import { fetchNearbyPOIs } from '../src/services/poiService';

jest.mock('../src/services/locationService');
jest.mock('../src/services/poiService', () => {
  const actual = jest.requireActual('../src/services/poiService');
  return {
    ...actual,
    fetchNearbyPOIs: jest.fn(),
  };
});

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { Pressable } = require('react-native');

  const animateToRegionMock = jest.fn();
  const fitToCoordinatesMock = jest.fn();

  const MapView = React.forwardRef(({ children, onPress, testID, ...rest }, ref) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: animateToRegionMock,
      fitToCoordinates: fitToCoordinatesMock,
    }));

    return (
      <Pressable testID={testID || 'map-view'} onPress={onPress} {...rest}>
        {children}
      </Pressable>
    );
  });

  const passthrough = ({ children, onPress, testID }) => (
    <Pressable testID={testID} onPress={onPress}>
      {children}
    </Pressable>
  );

  return {
    __esModule: true,
    default: MapView,
    Marker: passthrough,
    Polygon: passthrough,
    Polyline: passthrough,
    Circle: passthrough,
    __mapMocks: {
      animateToRegionMock,
      fitToCoordinatesMock,
    },
  };
});

import { __mapMocks } from 'react-native-maps';

global.fetch = jest.fn();

const selectedPOI = {
  coords: { latitude: 45.501, longitude: -73.57 },
  name: 'Library Cafe',
};

const makeArgs = (overrides = {}) => ({
  startText: '',
  userCoord: { latitude: 45.4973, longitude: -73.5789 },
  selectedPOI,
  setHasInteracted: jest.fn(),
  setStartText: jest.fn(),
  setStartCoord: jest.fn(),
  setStartCampusId: jest.fn(),
  setDestCoord: jest.fn(),
  setDestText: jest.fn(),
  setDestCampusId: jest.fn(),
  setShowDirectionsPanel: jest.fn(),
  setSelectedPOI: jest.fn(),
  ...overrides,
});

const Harness = ({ args }) => (
  <Pressable testID="poi-cta" onPress={() => handlePoiInfoCtaLogic(args)}>
    <Text>Get Directions</Text>
  </Pressable>
);

describe('POI info CTA onPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    locationService.getUserCoords.mockResolvedValue({
      latitude: 45.4973,
      longitude: -73.5789,
    });
    locationService.watchUserCoords.mockImplementation((cb) => {
      cb({ latitude: 45.4973, longitude: -73.5789 });
      return Promise.resolve({ remove: jest.fn() });
    });
    fetchNearbyPOIs.mockResolvedValue([]);
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        results: [],
      }),
    });
  });

  // startText is empty → the full prefill block runs and userCoord truthy sets startCoord.
  it('prefills My location and uses userCoord when startText is empty', () => {
    const args = makeArgs({
      startText: '',
      userCoord: { latitude: 45.4973, longitude: -73.5789 },
    });

    const { getByTestId } = render(<Harness args={args} />);
    fireEvent.press(getByTestId('poi-cta'));

    expect(args.setHasInteracted).toHaveBeenCalledWith(true);
    expect(args.setStartText).toHaveBeenCalledWith('My location');
    expect(args.setStartCoord).toHaveBeenCalledWith({
      latitude: 45.4973,
      longitude: -73.5789,
    });
    expect(args.setStartCampusId).toHaveBeenCalledWith(null);
    expect(args.setDestCoord).toHaveBeenCalledWith(selectedPOI.coords);
    expect(args.setDestText).toHaveBeenCalledWith(selectedPOI.name);
    expect(args.setDestCampusId).toHaveBeenCalledWith(null);
    expect(args.setShowDirectionsPanel).toHaveBeenCalledWith(true);
    expect(args.setSelectedPOI).toHaveBeenCalledWith(null);
  });

  // startText is null → the same prefill block runs, but userCoord is falsy so startCoord is skipped.
  it('skips setStartCoord when startText is null and userCoord is falsy', () => {
    const args = makeArgs({
      startText: null,
      userCoord: null,
    });

    const { getByTestId } = render(<Harness args={args} />);
    fireEvent.press(getByTestId('poi-cta'));

    expect(args.setHasInteracted).toHaveBeenCalledWith(true);
    expect(args.setStartText).toHaveBeenCalledWith('My location');
    expect(args.setStartCoord).not.toHaveBeenCalled();
    expect(args.setStartCampusId).toHaveBeenCalledWith(null);
    expect(args.setDestCoord).toHaveBeenCalledWith(selectedPOI.coords);
    expect(args.setDestText).toHaveBeenCalledWith(selectedPOI.name);
    expect(args.setDestCampusId).toHaveBeenCalledWith(null);
    expect(args.setShowDirectionsPanel).toHaveBeenCalledWith(true);
    expect(args.setSelectedPOI).toHaveBeenCalledWith(null);
  });

  // startText is already set → the whole prefill block is skipped.
  it('skips the prefill block entirely when startText is already set', () => {
    const args = makeArgs({
      startText: 'Hall Building',
      userCoord: { latitude: 45.4973, longitude: -73.5789 },
    });

    const { getByTestId } = render(<Harness args={args} />);
    fireEvent.press(getByTestId('poi-cta'));

    expect(args.setHasInteracted).not.toHaveBeenCalled();
    expect(args.setStartText).not.toHaveBeenCalled();
    expect(args.setStartCoord).not.toHaveBeenCalled();
    expect(args.setStartCampusId).not.toHaveBeenCalled();
    expect(args.setDestCoord).toHaveBeenCalledWith(selectedPOI.coords);
    expect(args.setDestText).toHaveBeenCalledWith(selectedPOI.name);
    expect(args.setDestCampusId).toHaveBeenCalledWith(null);
    expect(args.setShowDirectionsPanel).toHaveBeenCalledWith(true);
    expect(args.setSelectedPOI).toHaveBeenCalledWith(null);
  });

  // Recenter button branch: targetCoord is truthy and animateToRegion is called.
  it('presses the recenter button when a location is available', async () => {
    const { getByTestId } = render(<MapScreen />);

    await waitFor(() => expect(getByTestId('recenter-button')).toBeTruthy());

    await act(async () => {
      fireEvent.press(getByTestId('recenter-button'));
    });

    expect(__mapMocks.animateToRegionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 45.4973,
        longitude: -73.5789,
      }),
      500,
    );
  });

  // POI card offset branch: panel open → 300px, panel closed → 40px.
  it('returns the POI card bottom offset for both panel states', () => {
    expect(getPoiInfoCardBottomOffset(true)).toBe(300);
    expect(getPoiInfoCardBottomOffset(false)).toBe(40);
  });

  // Recenter logic branch: routeCoords/userCoord truthy → animateToRegion.
  it('animates to the recenter target when one exists', () => {
    const mapRef = {
      current: {
        animateToRegion: jest.fn(),
      },
    };

    handleRecenterPressLogic({
      routeCoords: [{ latitude: 45.5, longitude: -73.57 }],
      userCoord: null,
      mapRef,
    });

    expect(mapRef.current.animateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.5,
        longitude: -73.57,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      500,
    );
  });

  // Recenter logic branch: no targetCoord → animateToRegion is skipped.
  it('skips animateToRegion when no recenter target exists', () => {
    const mapRef = {
      current: {
        animateToRegion: jest.fn(),
      },
    };

    handleRecenterPressLogic({
      routeCoords: [],
      userCoord: null,
      mapRef,
    });

    expect(mapRef.current.animateToRegion).not.toHaveBeenCalled();
  });

  // POI list branch: a numeric rating renders the star row.
  it('renders a POI rating when nearby places include one', async () => {
    fetchNearbyPOIs.mockResolvedValueOnce([
      {
        id: 'poi-rated',
        name: 'Rated Cafe',
        rating: 4.5,
        distance: 120,
        coords: { latitude: 45.501, longitude: -73.57 },
        address: '789 Rated Ave',
      },
    ]);

    const { getByTestId, getByText } = render(<MapScreen />);

    await waitFor(() => expect(getByTestId('poi-button')).toBeTruthy());
    fireEvent.press(getByTestId('poi-button'));

    await waitFor(() => expect(getByTestId('poi-panel')).toBeTruthy());
    fireEvent.press(getByText('Show on map'));

    await waitFor(() => {
      expect(getByText('Rated Cafe')).toBeTruthy();
      expect(getByText('4.5 ★')).toBeTruthy();
    });
  });
});
