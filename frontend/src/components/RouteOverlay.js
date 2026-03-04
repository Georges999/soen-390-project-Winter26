import React from "react";
import { Polyline, Circle } from "react-native-maps";

export default function RouteOverlay({
  safeRouteCoords,
  routeRenderMode,
  routeRideSegments,
  routeWalkDotCoords,
}) {
  if (!Array.isArray(safeRouteCoords) || safeRouteCoords.length === 0) {
    return null;
  }

  if (routeRenderMode === "walking") {
    return (
      <>
        <Polyline
          testID="route-polyline"
          coordinates={safeRouteCoords}
          strokeWidth={6}
          strokeColor="rgba(37, 99, 235, 0.15)"
        />
        {routeWalkDotCoords.map((dot, idx) => (
          <Circle
            key={`walk-dot-${idx}`}
            center={dot}
            radius={1}
            fillColor="#2563eb"
            strokeColor="#2563eb"
            strokeWidth={1}
          />
        ))}
      </>
    );
  }

  if (routeRenderMode === "mixed") {
    return (
      <>
        {routeRideSegments.map((segment, idx) => (
          <Polyline
            key={`route-ride-${idx}`}
            testID={idx === 0 ? "route-polyline" : undefined}
            coordinates={segment}
            strokeWidth={5}
            strokeColor="#2563eb"
          />
        ))}
        {routeWalkDotCoords.map((dot, idx) => (
          <Circle
            key={`route-walk-dot-${idx}`}
            center={dot}
            radius={1}
            fillColor="#2563eb"
            strokeColor="#2563eb"
            strokeWidth={1}
          />
        ))}
      </>
    );
  }

  return (
    <Polyline
      testID="route-polyline"
      coordinates={safeRouteCoords}
      strokeWidth={5}
      strokeColor="#2563eb"
    />
  );
}
