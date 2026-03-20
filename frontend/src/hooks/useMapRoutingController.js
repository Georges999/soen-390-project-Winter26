import { useCallback, useEffect, useMemo } from "react";
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
export const getDirectionsMode = (travelMode, transitSubMode) => {
  if (travelMode !== "transit") return travelMode;
  if (transitSubMode === "public") return "transit";
  return null;
};

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

export function useMapRoutingSideEffects({
  routeState,
  routeSetters,
  mapState,
  shuttleState,
}) {
  const {
    startCoord,
    destCoord,
    isSimulating,
    isCrossCampusTrip,
    travelMode,
    followUser,
  } = routeState;
  const {
    stopSim,
    setShowDirectionsPanel,
    setNavActive,
    setFollowUser,
    setCurrentStepIndex,
    setIsTransitCollapsed,
    setTravelMode,
  } = routeSetters;
  const { userCoord, mapRef } = mapState;
  const { isActiveShuttleTrip, safeRouteCoords } = shuttleState;

  useEffect(() => {
    if (!startCoord || !destCoord) {
      setShowDirectionsPanel(false);
      setNavActive(false);
      setFollowUser(false);
      setCurrentStepIndex(0);
      stopSim();
      return;
    }

    setShowDirectionsPanel(true);
  }, [
    startCoord,
    destCoord,
    stopSim,
    setShowDirectionsPanel,
    setNavActive,
    setFollowUser,
    setCurrentStepIndex,
  ]);

  //when user starts simulation, transit details auto-hide to free map space
  useEffect(() => {
    if (isSimulating) {
      setIsTransitCollapsed(true);
    }
  }, [isSimulating, setIsTransitCollapsed]);

  //Within one campus, transit mode is invalid for routing -> walking in one campus

  useEffect(() => {
    if (!isCrossCampusTrip && travelMode === "transit") {
      setTravelMode("walking");
    }
  }, [isCrossCampusTrip, travelMode, setTravelMode]);

  //As user location updates, map keeps centering on them
  useEffect(() => {
    if (!followUser || !userCoord) return;
    mapRef.current?.animateToRegion(
      { ...userCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 },
      500,
    );
  }, [followUser, userCoord, mapRef]);

  // Auto-zoom map to full shuttle route when shuttle route becomes available
  useEffect(() => {
    if (!isActiveShuttleTrip || safeRouteCoords.length < 2) return;
    mapRef.current?.fitToCoordinates(safeRouteCoords, {
      edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
      animated: true,
    });
  }, [isActiveShuttleTrip, safeRouteCoords, mapRef]);
}

export function useMapRoutingActions({
  startCoord,
  destCoord,
  setFollowUser,
  setNavActive,
  setCurrentStepIndex,
  routeInfo,
  speechEnabled,
  speechApi,
  stripHtml,
  routeCoords,
  mapRef,
  userCoord,
  toggleSim,
}) {
  const handleGoPress = useCallback(() => {
    if (!startCoord || !destCoord) return;

    setFollowUser(true);
    setNavActive(true);
    setCurrentStepIndex(0); //resets navigation to the first instruction step

    const firstInstruction = routeInfo?.steps?.[0]?.instruction;
    if (firstInstruction && speechEnabled) {
      speechApi?.stop?.();
      speechApi?.speak?.(stripHtml(firstInstruction));
    }
    //adjusts map camera for navigation if route path exists
    if (routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
      //if route has no usable polyline, center map on user location
    } else if (userCoord) {
      mapRef.current?.animateToRegion(
        { ...userCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 },
        500,
      );
    }
  }, [
    startCoord,
    destCoord,
    setFollowUser,
    setNavActive,
    setCurrentStepIndex,
    routeInfo,
    speechEnabled,
    speechApi,
    stripHtml,
    routeCoords,
    mapRef,
    userCoord,
  ]);

  return {
    handleGoPress,
    handleSimulatePress: toggleSim,
  };
}
