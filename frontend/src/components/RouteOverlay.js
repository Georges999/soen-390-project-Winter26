import React from "react";
import PropTypes from "prop-types";
import { Polyline, Circle } from "react-native-maps";

const coordKey = (coord) => `${coord.latitude},${coord.longitude}`;
const segmentKey = (segment) => {
  const first = segment[0];
  const last = segment[segment.length - 1];
  if (!first || !last) return `segment-${segment.length}`;
  return `${coordKey(first)}-${coordKey(last)}-${segment.length}`;
};

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
        {routeWalkDotCoords.map((dot) => (
          <Circle
            key={`walk-dot-${coordKey(dot)}`}
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
            key={`route-ride-${segmentKey(segment)}`}
            testID={idx === 0 ? "route-polyline" : undefined}
            coordinates={segment}
            strokeWidth={5}
            strokeColor="#2563eb"
          />
        ))}
        {routeWalkDotCoords.map((dot) => (
          <Circle
            key={`route-walk-dot-${coordKey(dot)}`}
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

const coordPropType = PropTypes.shape({
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
});

RouteOverlay.propTypes = {
  safeRouteCoords: PropTypes.arrayOf(coordPropType).isRequired,
  routeRenderMode: PropTypes.string,
  routeRideSegments: PropTypes.arrayOf(PropTypes.arrayOf(coordPropType)),
  routeWalkDotCoords: PropTypes.arrayOf(coordPropType),
};

RouteOverlay.defaultProps = {
  routeRenderMode: "solid",
  routeRideSegments: [],
  routeWalkDotCoords: [],
};
