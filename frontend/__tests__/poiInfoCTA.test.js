import React from 'react';
import { Pressable, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import {
  handlePoiInfoCtaLogic,
  getPoiInfoCardBottomOffset,
  handleRecenterPressLogic,
} from '../src/screens/MapScreen';

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
  });

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

  it('returns the POI card bottom offset for both panel states', () => {
    expect(getPoiInfoCardBottomOffset(true)).toBe(300);
    expect(getPoiInfoCardBottomOffset(false)).toBe(40);
  });

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
});
