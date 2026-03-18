import { useMemo } from "react";
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

  return {
    isCrossCampusTrip: crossCampusTrip,
    directionsMode,
    shuttleRouting,
  };
}
