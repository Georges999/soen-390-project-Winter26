import { handleGoLogic } from '../src/screens/MapScreen';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MapView = React.forwardRef(({ children }, ref) => {
    React.useImperativeHandle(ref, () => ({
      fitToCoordinates: jest.fn(),
      animateToRegion: jest.fn(),
    }));

    return <View>{children}</View>;
  });

  const passthrough = ({ children }) => <View>{children}</View>;

  return {
    __esModule: true,
    default: MapView,
    Marker: passthrough,
    Polygon: passthrough,
    Polyline: passthrough,
    Circle: passthrough,
  };
});

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

describe('handleGo', () => {
  const makeMapRef = () => ({
    current: {
      fitToCoordinates: jest.fn(),
      animateToRegion: jest.fn(),
    },
  });

  const makeArgs = (overrides = {}) => {
    const mapRef = makeMapRef();
    const speech = require('expo-speech');
    speech.speak = jest.fn();
    speech.stop = jest.fn();

    return {
      startCoord: null,
      startText: '',
      userCoord: null,
      destCoord: null,
      routeInfo: { steps: [] },
      speechEnabled: true,
      routeCoords: [],
      mapRef,
      Speech: speech,
      stripHtml: jest.fn((text) => text.replace(/<[^>]+>/g, '')),
      setFollowUser: jest.fn(),
      setNavActive: jest.fn(),
      setCurrentStepIndex: jest.fn(),
      ...overrides,
      mapRef: overrides.mapRef ?? mapRef,
      Speech: overrides.Speech ?? speech,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // startCoord is set → effectiveStart uses startCoord, proceeds normally
  it('uses startCoord when provided', () => {
    const args = makeArgs({
      startCoord: { latitude: 45.5, longitude: -73.57 },
      startText: 'Hall Building',
      userCoord: { latitude: 10, longitude: 20 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [{ latitude: 45.52, longitude: -73.59 }],
    });

    handleGoLogic(args);

    expect(args.setFollowUser).toHaveBeenCalledWith(true);
    expect(args.setNavActive).toHaveBeenCalledWith(true);
    expect(args.setCurrentStepIndex).toHaveBeenCalledWith(0);
    expect(args.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(args.mapRef.current.animateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.5,
        longitude: -73.57,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      500,
    );
  });

  // startCoord null + startText non-empty → effectiveStart is null → early return, nothing called
  it('returns early when startText is non-empty and startCoord is null', () => {
    const args = makeArgs({
      startText: 'Hall Building',
      userCoord: null,
      destCoord: { latitude: 45.51, longitude: -73.58 },
    });

    handleGoLogic(args);

    expect(args.setFollowUser).not.toHaveBeenCalled();
    expect(args.setNavActive).not.toHaveBeenCalled();
    expect(args.setCurrentStepIndex).not.toHaveBeenCalled();
    expect(args.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(args.mapRef.current.animateToRegion).not.toHaveBeenCalled();
    expect(args.Speech.stop).not.toHaveBeenCalled();
    expect(args.Speech.speak).not.toHaveBeenCalled();
  });

  // startCoord null + startText empty → effectiveStart uses userCoord, proceeds
  it('uses userCoord when startText is empty and startCoord is null', () => {
    const args = makeArgs({
      startText: '',
      userCoord: { latitude: 45.4973, longitude: -73.5789 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [],
    });

    handleGoLogic(args);

    expect(args.setFollowUser).toHaveBeenCalledWith(true);
    expect(args.setNavActive).toHaveBeenCalledWith(true);
    expect(args.setCurrentStepIndex).toHaveBeenCalledWith(0);
    expect(args.mapRef.current.animateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.4973,
        longitude: -73.5789,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      500,
    );
  });

  // !effectiveStart → early return
  it('returns early when effectiveStart is falsy', () => {
    const args = makeArgs({
      startText: '',
      userCoord: null,
      destCoord: { latitude: 45.51, longitude: -73.58 },
    });

    handleGoLogic(args);

    expect(args.setFollowUser).not.toHaveBeenCalled();
    expect(args.setNavActive).not.toHaveBeenCalled();
    expect(args.setCurrentStepIndex).not.toHaveBeenCalled();
    expect(args.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(args.mapRef.current.animateToRegion).not.toHaveBeenCalled();
  });

  // !destCoord → early return
  it('returns early when destCoord is falsy', () => {
    const args = makeArgs({
      startCoord: { latitude: 45.5, longitude: -73.57 },
      userCoord: { latitude: 45.4973, longitude: -73.5789 },
      destCoord: null,
    });

    handleGoLogic(args);

    expect(args.setFollowUser).not.toHaveBeenCalled();
    expect(args.setNavActive).not.toHaveBeenCalled();
    expect(args.setCurrentStepIndex).not.toHaveBeenCalled();
    expect(args.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(args.mapRef.current.animateToRegion).not.toHaveBeenCalled();
  });

  // firstInstruction exists + speechEnabled true → Speech.stop and Speech.speak called
  it('calls Speech when there is a first instruction and speech is enabled', () => {
    const args = makeArgs({
      startCoord: { latitude: 45.5, longitude: -73.57 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [],
      routeInfo: { steps: [{ instruction: '<b>Head</b> north' }] },
      speechEnabled: true,
    });

    handleGoLogic(args);

    expect(args.Speech.stop).toHaveBeenCalled();
    expect(args.stripHtml).toHaveBeenCalledWith('<b>Head</b> north');
    expect(args.Speech.speak).toHaveBeenCalledWith('Head north');
  });

  // firstInstruction exists + speechEnabled false → Speech NOT called
  it('does not call Speech when speechEnabled is false', () => {
    const args = makeArgs({
      startCoord: { latitude: 45.5, longitude: -73.57 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [],
      routeInfo: { steps: [{ instruction: '<b>Head</b> north' }] },
      speechEnabled: false,
    });

    handleGoLogic(args);

    expect(args.Speech.stop).not.toHaveBeenCalled();
    expect(args.Speech.speak).not.toHaveBeenCalled();
    expect(args.stripHtml).not.toHaveBeenCalled();
  });

  // firstInstruction is undefined → Speech block skipped
  it('skips Speech when firstInstruction is undefined', () => {
    const args = makeArgs({
      startCoord: { latitude: 45.5, longitude: -73.57 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [],
      routeInfo: { steps: [{ instruction: undefined }] },
      speechEnabled: true,
    });

    handleGoLogic(args);

    expect(args.Speech.stop).not.toHaveBeenCalled();
    expect(args.Speech.speak).not.toHaveBeenCalled();
    expect(args.stripHtml).not.toHaveBeenCalled();
  });

  // routeCoords.length > 1 → fitToCoordinates called, animateToRegion NOT called
  it('fits route coordinates when the route has multiple points', () => {
    const args = makeArgs({
      startCoord: { latitude: 45.5, longitude: -73.57 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [
        { latitude: 45.5, longitude: -73.57 },
        { latitude: 45.51, longitude: -73.58 },
      ],
    });

    handleGoLogic(args);

    expect(args.mapRef.current.fitToCoordinates).toHaveBeenCalledWith(
      args.routeCoords,
      {
        edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
        animated: true,
      },
    );
    expect(args.mapRef.current.animateToRegion).not.toHaveBeenCalled();
  });

  // routeCoords.length <= 1 + effectiveStart truthy → animateToRegion called
  it('animates to the effective start when the route has 0 or 1 point', () => {
    const args = makeArgs({
      startCoord: null,
      startText: '',
      userCoord: { latitude: 45.4973, longitude: -73.5789 },
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [{ latitude: 45.51, longitude: -73.58 }],
    });

    handleGoLogic(args);

    expect(args.mapRef.current.animateToRegion).toHaveBeenCalledWith(
      {
        latitude: 45.4973,
        longitude: -73.5789,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      },
      500,
    );
    expect(args.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
  });

  // routeCoords.length <= 1 + effectiveStart falsy → neither map method called
  it('does not call map methods when route is short and effectiveStart is falsy', () => {
    const args = makeArgs({
      startCoord: null,
      startText: '',
      userCoord: null,
      destCoord: { latitude: 45.51, longitude: -73.58 },
      routeCoords: [],
    });

    handleGoLogic(args);

    expect(args.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(args.mapRef.current.animateToRegion).not.toHaveBeenCalled();
  });
});
