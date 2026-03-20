export const getDistanceMeters = (from, to) => {
  if (!from || !to) return Number.POSITIVE_INFINITY;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;

  const dLat = toRad(to.latitude - from.latitude);
  const dLng = toRad(to.longitude - from.longitude);

  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const filterPOIsByMode = ({
  pois,
  userCoord,
  mode,
  nearestCount,
  radius,
}) => {
  if (!userCoord || !Array.isArray(pois)) return [];

  const withDistance = pois
    .map((poi) => ({
      ...poi,
      distance: getDistanceMeters(userCoord, poi.coords),
    }))
    .sort((a, b) => a.distance - b.distance);

  if (mode === "nearest") {
    return withDistance.slice(0, Math.max(1, nearestCount ?? 1));
  }

  if (mode === "range") {
    return withDistance.filter(
      (poi) => poi.distance <= (radius ?? Number.POSITIVE_INFINITY)
    );
  }

  return withDistance;
};