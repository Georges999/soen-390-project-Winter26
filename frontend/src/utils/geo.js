
export function isPointInPolygon(point, polygonCoords) {
  const x = point.longitude;
  const y = point.latitude;

  let inside = false;
  for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
    const xi = polygonCoords[i].longitude, yi = polygonCoords[i].latitude;
    const xj = polygonCoords[j].longitude, yj = polygonCoords[j].latitude;

    const intersect =
      (yi > y) !== (yj > y) &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
}

export function findBuildingUserIsIn(userPoint, buildings) {
  for (const b of buildings) {
    if (!b?.coordinates || b.coordinates.length < 3) continue;
    if (isPointInPolygon(userPoint, b.coordinates)) return b;
  }
  return null;
}
