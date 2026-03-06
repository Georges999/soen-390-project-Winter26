import {
  BikingRouteStrategy,
  DrivingRouteStrategy,
  PublicTransitRouteStrategy,
  ShuttleRouteStrategy,
  WalkingRouteStrategy,
  getRoute,
  getRoutingStrategy,
} from "../../src/routing/routeStrategy";

jest.mock("../../src/utils/geoUtils", () => ({
  buildDotCoords: jest.fn((coords) =>
    Array.isArray(coords) && coords.length > 1 ? [{ latitude: 1, longitude: 1 }] : [],
  ),
}));

describe("routeStrategy", () => {
  it("returns walking strategy by default for unknown mode", () => {
    expect(getRoutingStrategy({ travelMode: "unknown" })).toBe(WalkingRouteStrategy);
  });

  it("returns shuttle strategy for cross-campus shuttle transit", () => {
    const strategy = getRoutingStrategy({
      travelMode: "transit",
      transitSubMode: "shuttle",
      isCrossCampusTrip: true,
    });
    expect(strategy).toBe(ShuttleRouteStrategy);
  });

  it("returns public transit strategy for non-shuttle transit", () => {
    const strategy = getRoutingStrategy({
      travelMode: "transit",
      transitSubMode: "bus",
      isCrossCampusTrip: false,
    });
    expect(strategy).toBe(PublicTransitRouteStrategy);
  });

  it("builds walking route render data", () => {
    const routeCoords = [
      { latitude: 45.49, longitude: -73.57 },
      { latitude: 45.5, longitude: -73.58 },
    ];
    const result = WalkingRouteStrategy.getRoute({ baseRouteCoords: routeCoords });
    expect(result.routeCoords).toEqual(routeCoords);
    expect(result.render.mode).toBe("walking");
    expect(result.render.rideSegments).toEqual([]);
    expect(result.render.walkDotCoords.length).toBeGreaterThan(0);
  });

  it("builds driving and biking as solid render mode", () => {
    const coords = [{ latitude: 1, longitude: 1 }];
    expect(DrivingRouteStrategy.getRoute({ baseRouteCoords: coords }).render.mode).toBe("solid");
    expect(BikingRouteStrategy.getRoute({ baseRouteCoords: coords }).render.mode).toBe("solid");
  });

  it("builds mixed public transit render when walking and ride steps exist", () => {
    const result = PublicTransitRouteStrategy.getRoute({
      baseRouteCoords: [{ latitude: 0, longitude: 0 }],
      baseRouteInfo: {
        steps: [
          {
            travelMode: "WALKING",
            coords: [
              { latitude: 1, longitude: 1 },
              { latitude: 2, longitude: 2 },
            ],
          },
          {
            travelMode: "TRANSIT",
            coords: [
              { latitude: 3, longitude: 3 },
              { latitude: 4, longitude: 4 },
            ],
          },
        ],
      },
      routeOptions: [{ id: "opt-1" }],
    });

    expect(result.render.mode).toBe("mixed");
    expect(result.render.rideSegments).toHaveLength(1);
    expect(result.render.walkDotCoords.length).toBeGreaterThan(0);
    expect(result.routeOptions).toEqual([{ id: "opt-1" }]);
  });

  it("falls back to solid public transit render when no usable steps exist", () => {
    const result = PublicTransitRouteStrategy.getRoute({
      baseRouteCoords: [{ latitude: 0, longitude: 0 }],
      baseRouteInfo: { steps: [{ travelMode: "WALKING", coords: [{ latitude: 1, longitude: 1 }] }] },
    });

    expect(result.render.mode).toBe("solid");
    expect(result.render.walkDotCoords).toEqual([]);
    expect(result.render.rideSegments).toEqual([]);
  });

  it("returns empty route for inactive shuttle trip", () => {
    const result = ShuttleRouteStrategy.getRoute({ isActiveShuttleTrip: false });
    expect(result.routeCoords).toEqual([]);
    expect(result.routeInfo).toBeNull();
    expect(result.render.mode).toBe("solid");
  });

  it("snaps and merges active shuttle segments", () => {
    const walkToStart = { latitude: 1, longitude: 1 };
    const walkToEnd = { latitude: 2, longitude: 2 };
    const rideStart = { latitude: 3, longitude: 3 };
    const rideEnd = { latitude: 4, longitude: 4 };
    const walkFromEnd = { latitude: 5, longitude: 5 };

    const result = ShuttleRouteStrategy.getRoute({
      isActiveShuttleTrip: true,
      walkToShuttleCoords: [walkToStart, walkToEnd],
      shuttleRideCoords: [rideStart, rideEnd],
      walkFromShuttleCoords: [{ latitude: 8, longitude: 8 }, walkFromEnd],
      shuttleRideInfo: { durationText: "10 min" },
    });

    expect(result.render.mode).toBe("mixed");
    expect(result.render.rideSegments).toEqual([[rideStart, rideEnd]]);
    expect(result.routeInfo).toEqual({ durationText: "10 min" });
    expect(result.routeCoords[0]).toEqual(walkToStart);
    expect(result.routeCoords[1]).toEqual(rideStart);
    expect(result.routeCoords[result.routeCoords.length - 1]).toEqual(walkFromEnd);
  });

  it("uses explicit strategy override in getRoute", () => {
    const customStrategy = {
      getRoute: jest.fn(() => ({ routeCoords: [1], routeInfo: null, routeOptions: [], render: { mode: "solid" } })),
    };

    const result = getRoute({ strategy: customStrategy });
    expect(customStrategy.getRoute).toHaveBeenCalled();
    expect(result.routeCoords).toEqual([1]);
  });
});
