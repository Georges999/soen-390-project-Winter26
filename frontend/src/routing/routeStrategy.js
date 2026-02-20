import { buildDotCoords } from "../utils/geoUtils";

const toCoords = (coords) => (Array.isArray(coords) ? coords : []);

const buildTransitRenderData = (routeInfo) => {
  const steps = Array.isArray(routeInfo?.steps) ? routeInfo.steps : [];
  const walkDotCoords = steps
    .filter(
      (step) =>
        String(step?.travelMode || "").toUpperCase() === "WALKING" &&
        Array.isArray(step?.coords) &&
        step.coords.length > 1,
    )
    .flatMap((step) => buildDotCoords(step.coords, 3)); //creates many small points every ~3 meters along that segment

  const rideSegments = steps
    .filter(
      (step) =>
        String(step?.travelMode || "").toUpperCase() !== "WALKING" &&
        Array.isArray(step?.coords) &&
        step.coords.length > 1,
    )
    .map((step) => step.coords);

  return { walkDotCoords, rideSegments };
};

//connecting 3 shuttle segments together
const snapShuttleSegments = ({
  walkToShuttleCoords,
  shuttleRideCoords,
  walkFromShuttleCoords,
}) => {
  const walkTo = [...toCoords(walkToShuttleCoords)];
  const ride = [...toCoords(shuttleRideCoords)];
  const walkFrom = [...toCoords(walkFromShuttleCoords)];

  //boundaries -> End of walk-to is forced to equal start of ride & Start of walk-from is forced to equal end of ride
  if (walkTo.length > 0 && ride.length > 0)
    if (walkTo.length > 0 && ride.length > 0) {
      walkTo[walkTo.length - 1] = ride[0];
    }
  if (walkFrom.length > 0 && ride.length > 0) {
    walkFrom[0] = ride[ride.length - 1];
  }

  return { walkTo, ride, walkFrom };
};

const mergeShuttleSegments = ({ walkTo, ride, walkFrom }) => {
  const chunks = [walkTo, ride, walkFrom].filter(
    (chunk) => Array.isArray(chunk) && chunk.length > 0,
  );
  if (chunks.length === 0) return [];

  const merged = [];
  chunks.forEach((chunk) => {
    chunk.forEach((point) => {
      const prev = merged[merged.length - 1];
      if (
        prev &&
        prev.latitude === point.latitude &&
        prev.longitude === point.longitude
      ) {
        return;
      }
      merged.push(point);
    });
  });

  return merged;
};

export const WalkingRouteStrategy = {
  name: "walking",
  getRoute(params) {
    const routeCoords = toCoords(params.baseRouteCoords);
    return {
      routeCoords,
      routeInfo: params.baseRouteInfo ?? null,
      routeOptions: [],
      render: {
        mode: "walking",
        walkDotCoords: buildDotCoords(routeCoords, 3),
        rideSegments: [],
      },
    };
  },
};

export const DrivingRouteStrategy = {
  name: "driving",
  getRoute(params) {
    return {
      routeCoords: toCoords(params.baseRouteCoords),
      routeInfo: params.baseRouteInfo ?? null,
      routeOptions: [],
      render: { mode: "solid", walkDotCoords: [], rideSegments: [] },
    };
  },
};

export const BikingRouteStrategy = {
  name: "bicycling",
  getRoute(params) {
    return {
      routeCoords: toCoords(params.baseRouteCoords),
      routeInfo: params.baseRouteInfo ?? null,
      routeOptions: [],
      render: { mode: "solid", walkDotCoords: [], rideSegments: [] },
    };
  },
};

export const PublicTransitRouteStrategy = {
  name: "public-transit",
  getRoute(params) {
    const routeCoords = toCoords(params.baseRouteCoords);
    const routeInfo = params.baseRouteInfo ?? null;
    const { walkDotCoords, rideSegments } = buildTransitRenderData(routeInfo);
    const hasMixedSegments =
      rideSegments.length > 0 || walkDotCoords.length > 0;

    return {
      routeCoords,
      routeInfo,
      routeOptions: Array.isArray(params.routeOptions)
        ? params.routeOptions
        : [],
      render: hasMixedSegments
        ? { mode: "mixed", walkDotCoords, rideSegments }
        : { mode: "solid", walkDotCoords: [], rideSegments: [] },
    };
  },
};

export const ShuttleRouteStrategy = {
  name: "shuttle",
  getRoute(params) {
    if (!params.isActiveShuttleTrip) {
      return {
        routeCoords: [],
        routeInfo: null,
        routeOptions: [],
        render: { mode: "solid", walkDotCoords: [], rideSegments: [] },
      };
    }

    const snapped = snapShuttleSegments(params);
    const routeCoords = mergeShuttleSegments(snapped);

    return {
      routeCoords,
      routeInfo: params.shuttleRideInfo ?? null,
      routeOptions: [],
      render: {
        mode: "mixed",
        walkDotCoords: [
          ...buildDotCoords(snapped.walkTo, 3),
          ...buildDotCoords(snapped.walkFrom, 3),
        ],
        rideSegments: snapped.ride.length > 1 ? [snapped.ride] : [],
      },
    };
  },
};

export function getRoutingStrategy({
  travelMode,
  transitSubMode,
  isCrossCampusTrip,
}) {
  if (travelMode === "walking") return WalkingRouteStrategy;
  if (travelMode === "driving") return DrivingRouteStrategy;
  if (travelMode === "bicycling") return BikingRouteStrategy;
  if (travelMode === "transit") {
    if (transitSubMode === "shuttle" && isCrossCampusTrip) {
      return ShuttleRouteStrategy;
    }
    return PublicTransitRouteStrategy;
  }
  return WalkingRouteStrategy;
}

// returns { routeCoords, routeInfo, routeOptions, render: { mode, rideSegments, walkDotCoords } }
export function getRoute(params) {
  const strategy =
    params.strategy ??
    getRoutingStrategy({
      travelMode: params.travelMode,
      transitSubMode: params.transitSubMode,
      isCrossCampusTrip: params.isCrossCampusTrip,
    });

  return strategy.getRoute(params);
}
