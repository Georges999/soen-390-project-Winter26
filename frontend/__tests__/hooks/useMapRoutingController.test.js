import { renderHook, act } from "@testing-library/react-native";
import {
  getDirectionsMode,
  useMapRoutingController,
  useMapRoutingSideEffects,
  useMapRoutingActions,
} from "../../src/hooks/useMapRoutingController";
import { getRoute, getRoutingStrategy } from "../../src/routing/routeStrategy";

jest.mock("../../src/routing/routeStrategy", () => ({
  getRoute: jest.fn(),
  getRoutingStrategy: jest.fn(),
}));

describe("getDirectionsMode", () => {
  it("returns travel mode directly for non-transit modes", () => {
    expect(getDirectionsMode("walking", "public")).toBe("walking");
    expect(getDirectionsMode("driving", "shuttle")).toBe("driving");
  });

  it("returns transit only for public transit submode", () => {
    expect(getDirectionsMode("transit", "public")).toBe("transit");
    expect(getDirectionsMode("transit", "shuttle")).toBeNull();
  });
});

//Unit tests for derived routing outputs and shuttle routing decisions.
describe("useMapRoutingController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getRoutingStrategy.mockReturnValue("mock-strategy");
  });

  it("returns shuttle routing for active cross-campus shuttle transit", () => {
    getRoute.mockReturnValue({
      routeCoords: [],
      routeInfo: null,
      routeOptions: [],
      render: { mode: "solid", walkDotCoords: [], rideSegments: [] },
    }); //this object is returned by the mocked getRoute and can be customized per test case as needed

    const routeInputs = {
      isActiveShuttleTrip: true,
      baseRouteCoords: [],
      baseRouteInfo: null,
      routeOptions: [],
      shuttleRideInfo: null,
      walkToShuttleCoords: [],
      shuttleRideCoords: [],
      walkFromShuttleCoords: [],
    };

    const { result } = renderHook(() =>
      useMapRoutingController({
        travelMode: "transit",
        transitSubMode: "shuttle",
        startCampusId: "sgw",
        destCampusId: "loyola",
        isShuttleServiceActive: true,
        routeInputs,
      }),
    );

    expect(result.current.isCrossCampusTrip).toBe(true);
    expect(result.current.directionsMode).toBeNull();
    expect(result.current.shuttleRouting).toEqual({
      originAddress: "45.496820,-73.578760",
      destinationAddress: "45.458360,-73.638150",
      waypoints: [],
    });
    expect(getRoutingStrategy).toHaveBeenCalledWith({
      travelMode: "transit",
      transitSubMode: "shuttle",
      isCrossCampusTrip: true,
    });
    expect(getRoute).toHaveBeenCalled();
  });

  it("returns null shuttle routing for invalid campus key and fallback routing result when no route inputs", () => {
    const { result } = renderHook(() =>
      useMapRoutingController({
        travelMode: "transit",
        transitSubMode: "shuttle",
        startCampusId: "unknown", //fallback to null shuttle routing when campus key is invalid
        destCampusId: "loyola",
        isShuttleServiceActive: true,
      }),
    );

    expect(result.current.shuttleRouting).toBeNull();
    expect(result.current.routeCoords).toEqual([]);
    expect(result.current.routeInfo).toBeNull();
    expect(result.current.strategyRouteOptions).toEqual([]);
    expect(result.current.safeRouteCoords).toEqual([]);
    expect(result.current.routeRenderMode).toBe("solid");
    expect(result.current.routeRideSegments).toEqual([]);
    expect(result.current.routeWalkDotCoords).toEqual([]);
    expect(getRoute).not.toHaveBeenCalled();
  });

  it("normalizes non-array route output from getRoute", () => {
    getRoute.mockReturnValue({
      routeCoords: null,
      routeInfo: { distance: "1 km" },
      routeOptions: null,
      render: { mode: "dotted", walkDotCoords: null, rideSegments: null },
    });

    const routeInputs = {
      isActiveShuttleTrip: false,
      baseRouteCoords: [],
      baseRouteInfo: null,
      routeOptions: [],
      shuttleRideInfo: null,
      walkToShuttleCoords: [],
      shuttleRideCoords: [],
      walkFromShuttleCoords: [],
    };

    const { result } = renderHook(() =>
      useMapRoutingController({
        travelMode: "walking",
        transitSubMode: "shuttle",
        startCampusId: "sgw",
        destCampusId: "sgw",
        isShuttleServiceActive: false,
        routeInputs,
      }),
    );

    expect(result.current.routeCoords).toBeNull();
    expect(result.current.safeRouteCoords).toEqual([]);
    expect(result.current.strategyRouteOptions).toBeNull();
    expect(result.current.routeRenderMode).toBe("dotted");
    expect(result.current.routeRideSegments).toEqual([]);
    expect(result.current.routeWalkDotCoords).toEqual([]);
  });
});

// Unit tests for routing-related effects extracted from MapScreen.
describe("useMapRoutingSideEffects", () => {
  const buildBaseProps = () => ({
    startCoord: null,
    destCoord: null,
    stopSim: jest.fn(),
    setShowDirectionsPanel: jest.fn(),
    setNavActive: jest.fn(),
    setFollowUser: jest.fn(),
    setCurrentStepIndex: jest.fn(),
    isSimulating: false,
    setIsTransitCollapsed: jest.fn(),
    isCrossCampusTrip: true,
    travelMode: "walking",
    setTravelMode: jest.fn(),
    followUser: false,
    userCoord: null,
    mapRef: {
      current: {
        animateToRegion: jest.fn(),
        fitToCoordinates: jest.fn(),
      },
    },
    isActiveShuttleTrip: false,
    safeRouteCoords: [],
  });

  it("resets routing UI when start/destination are missing", () => {
    const props = buildBaseProps();

    renderHook(() => useMapRoutingSideEffects(props));

    expect(props.setShowDirectionsPanel).toHaveBeenCalledWith(false);
    expect(props.setNavActive).toHaveBeenCalledWith(false);
    expect(props.setFollowUser).toHaveBeenCalledWith(false);
    expect(props.setCurrentStepIndex).toHaveBeenCalledWith(0);
    expect(props.stopSim).toHaveBeenCalled();
  });

  it("shows directions when both start and destination are present", () => {
    const props = buildBaseProps();
    props.startCoord = { latitude: 45.5, longitude: -73.58 };
    props.destCoord = { latitude: 45.46, longitude: -73.63 };

    renderHook(() => useMapRoutingSideEffects(props));

    expect(props.setShowDirectionsPanel).toHaveBeenCalledWith(true);
    expect(props.stopSim).not.toHaveBeenCalled();
  });

  it("handles simulation/transit/follow-user and shuttle fit side effects", () => {
    const props = buildBaseProps();
    props.startCoord = { latitude: 45.5, longitude: -73.58 };
    props.destCoord = { latitude: 45.46, longitude: -73.63 };
    props.isSimulating = true;
    props.isCrossCampusTrip = false;
    props.travelMode = "transit";
    props.followUser = true;
    props.userCoord = { latitude: 45.5, longitude: -73.58 };
    props.isActiveShuttleTrip = true;
    props.safeRouteCoords = [
      { latitude: 45.5, longitude: -73.58 },
      { latitude: 45.46, longitude: -73.63 },
    ];

    renderHook(() => useMapRoutingSideEffects(props));

    expect(props.setIsTransitCollapsed).toHaveBeenCalledWith(true);
    expect(props.setTravelMode).toHaveBeenCalledWith("walking");
    expect(props.mapRef.current.animateToRegion).toHaveBeenCalled();
    expect(props.mapRef.current.fitToCoordinates).toHaveBeenCalledWith(
      props.safeRouteCoords,
      expect.objectContaining({ animated: true }),
    );
  });
});

// Unit tests for routing action handlers (Go + Simulate).
describe("useMapRoutingActions", () => {
  const buildActionProps = () => ({
    startCoord: { latitude: 45.5, longitude: -73.58 },
    destCoord: { latitude: 45.46, longitude: -73.63 },
    setFollowUser: jest.fn(),
    setNavActive: jest.fn(),
    setCurrentStepIndex: jest.fn(),
    routeInfo: { steps: [{ instruction: "<b>Head east</b>" }] },
    speechEnabled: true,
    speechApi: {
      stop: jest.fn(),
      speak: jest.fn(),
    },
    stripHtml: jest.fn((s) => s.replace(/<[^>]+>/g, "")),
    routeCoords: [
      { latitude: 45.5, longitude: -73.58 },
      { latitude: 45.49, longitude: -73.59 },
    ],
    mapRef: {
      current: {
        fitToCoordinates: jest.fn(),
        animateToRegion: jest.fn(),
      },
    },
    userCoord: { latitude: 45.5, longitude: -73.58 },
    toggleSim: jest.fn(),
  });

  it("handleGoPress updates nav state, triggers speech and fits route", () => {
    const props = buildActionProps();
    const { result } = renderHook(() => useMapRoutingActions(props));

    act(() => {
      result.current.handleGoPress();
    }); //map routing actions returns functions so to test them we need to call them within an act block -> basically manually call them

    expect(props.setFollowUser).toHaveBeenCalledWith(true);
    expect(props.setNavActive).toHaveBeenCalledWith(true);
    expect(props.setCurrentStepIndex).toHaveBeenCalledWith(0);
    expect(props.speechApi.stop).toHaveBeenCalled();
    expect(props.speechApi.speak).toHaveBeenCalledWith("Head east");
    expect(props.mapRef.current.fitToCoordinates).toHaveBeenCalledWith(
      props.routeCoords,
      expect.objectContaining({ animated: true }),
    );
  });

  //Route has only one coordinate. -> Expects no fit-to-route, but camera recenters on user.

  it("handleGoPress recenters on user when route has no polyline", () => {
    const props = buildActionProps();
    props.routeCoords = [{ latitude: 45.5, longitude: -73.58 }];
    const { result } = renderHook(() => useMapRoutingActions(props));

    act(() => {
      result.current.handleGoPress();
    });

    expect(props.mapRef.current.fitToCoordinates).not.toHaveBeenCalled();
    expect(props.mapRef.current.animateToRegion).toHaveBeenCalled();
  });

  it("handleGoPress exits early when coordinates are missing and handleSimulatePress toggles simulation", () => {
    const props = buildActionProps();
    props.startCoord = null;
    const { result } = renderHook(() => useMapRoutingActions(props));

    act(() => {
      result.current.handleGoPress();
      result.current.handleSimulatePress();
    });

    expect(props.setFollowUser).not.toHaveBeenCalled();
    expect(props.toggleSim).toHaveBeenCalled();
  });
});
