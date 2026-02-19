//it calculates the average of all polygon coordinates to get a middle point for zoom/labels.
const getPolygonCenter = (points = []) => {
  if (!points.length) return null; //null if no points since theres no center

  const totals = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: totals.latitude / points.length,
    longitude: totals.longitude / points.length,
  };
};

//to give accurate map distance between two lat/lng points
const distanceMeters = (a, b) => {
  if (!a || !b) return Infinity;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; //Earth radius in meters
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

//create evenly spaced dot points along a route line
function buildDotCoords(coords, spacingMeters = 3) {
  if (!Array.isArray(coords) || coords.length < 2) return [];

  const dots = [];
  let nextAt = 0;

  for (let i = 1; i < coords.length; i++) {
    const from = coords[i - 1];
    const to = coords[i];
    const segmentLength = distanceMeters(from, to);
    if (!Number.isFinite(segmentLength) || segmentLength <= 0) continue;

    while (nextAt <= segmentLength) {
      const t = nextAt / segmentLength;
      dots.push({
        latitude: from.latitude + (to.latitude - from.latitude) * t,
        longitude: from.longitude + (to.longitude - from.longitude) * t,
      });
      nextAt += spacingMeters;
    }

    nextAt -= segmentLength;
  }

  return dots;
}

export { getPolygonCenter, distanceMeters, buildDotCoords };
