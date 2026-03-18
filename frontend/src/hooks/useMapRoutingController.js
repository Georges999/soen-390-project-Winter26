import { useMemo } from "react";
import { getRoute, getRoutingStrategy } from "../routing/routeStrategy";
//immutable object
export const SHUTTLE_STOP_COORD_BY_CAMPUS = Object.freeze({
  // SGW shuttle stop on De Maisonneuve side
  sgw: "45.496820,-73.578760",
  // Loyola stop on Sherbrooke Street
  loyola: "45.458360,-73.638150",
});

export const isCrossCampusTrip = (startCampusId, destCampusId) =>
  Boolean(startCampusId && destCampusId && startCampusId !== destCampusId);

//selected travel mode to a valid Google Directions mode
export const getDirectionsMode = (travelMode, transitSubMode) =>
  travelMode === "transit"
    ? transitSubMode === "public"
      ? "transit"
      : null
    : travelMode;

export function useMapRoutingController({
  travelMode,
  transitSubMode,
  startCampusId,
  destCampusId,
  isShuttleServiceActive,
  routeInputs = null,
}) {
  const crossCampusTrip = useMemo(
    () => isCrossCampusTrip(startCampusId, destCampusId),
    [startCampusId, destCampusId],
  );

  const directionsMode = useMemo(
    () => getDirectionsMode(travelMode, transitSubMode),
    [travelMode, transitSubMode],
  );

  const shuttleRouting = useMemo(() => {
    if (
      travelMode !== "transit" ||
      transitSubMode !== "shuttle" ||
      !crossCampusTrip ||
      !isShuttleServiceActive
    ) {
      return null;
    }

    const originAddress = SHUTTLE_STOP_COORD_BY_CAMPUS[startCampusId];
    const destinationAddress = SHUTTLE_STOP_COORD_BY_CAMPUS[destCampusId];
    if (!originAddress || !destinationAddress) return null;

    return {
      originAddress,
      destinationAddress,
      waypoints: [],
    };
  }, [
    travelMode,
    transitSubMode,
    crossCampusTrip,
    isShuttleServiceActive,
    startCampusId,
    destCampusId,
  ]);

  const hasRoutingInputs = Boolean(routeInputs);

  const routingStrategy = useMemo(
    () =>
      getRoutingStrategy({
        travelMode,
        transitSubMode,
        isCrossCampusTrip: crossCampusTrip,
      }),
    [travelMode, transitSubMode, crossCampusTrip],
  );

  const routingResult = useMemo(() => {
    if (!hasRoutingInputs) {
      return {
        routeCoords: [],
        routeInfo: null,
        routeOptions: [],
        render: { mode: "solid", walkDotCoords: [], rideSegments: [] },
      };
    }

    const {
      isActiveShuttleTrip,
      baseRouteCoords,
      baseRouteInfo,
      routeOptions,
      shuttleRideInfo,
      walkToShuttleCoords,
      shuttleRideCoords,
      walkFromShuttleCoords,
    } = routeInputs;

    return getRoute({
      strategy: routingStrategy,
      travelMode,
      transitSubMode,
      isCrossCampusTrip: crossCampusTrip,
      isActiveShuttleTrip,
      baseRouteCoords,
      baseRouteInfo,
      routeOptions,
      shuttleRideInfo,
      walkToShuttleCoords,
      shuttleRideCoords,
      walkFromShuttleCoords,
    });
  }, [
    hasRoutingInputs,
    routingStrategy,
    travelMode,
    transitSubMode,
    crossCampusTrip,
    routeInputs,
  ]);

  //Normalize routing result to ensure consistent data structure for the MapScreen
  const routeCoords = routingResult.routeCoords;
  const routeInfo = routingResult.routeInfo;
  const strategyRouteOptions = routingResult.routeOptions;
  const safeRouteCoords = Array.isArray(routeCoords) ? routeCoords : [];
  const routeRenderMode = routingResult.render?.mode ?? "solid";
  const routeRideSegments = Array.isArray(routingResult.render?.rideSegments)
    ? routingResult.render.rideSegments
    : [];
  const routeWalkDotCoords = Array.isArray(routingResult.render?.walkDotCoords)
    ? routingResult.render.walkDotCoords
    : [];

  return {
    isCrossCampusTrip: crossCampusTrip,
    directionsMode,
    shuttleRouting,
    routeCoords,
    routeInfo,
    strategyRouteOptions,
    safeRouteCoords,
    routeRenderMode,
    routeRideSegments,
    routeWalkDotCoords,
  };
}
