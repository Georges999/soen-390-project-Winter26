import React from "react";
import { render } from "@testing-library/react-native";
import RouteOverlay from "../../src/components/RouteOverlay";

const coordA = { latitude: 45.5, longitude: -73.57 };
const coordB = { latitude: 45.51, longitude: -73.58 };
const walkDot = { latitude: 45.505, longitude: -73.575 };

describe("RouteOverlay", () => {
  it("renders nothing when route is empty", () => {
    const { queryByTestId } = render(
      <RouteOverlay
        safeRouteCoords={[]}
        routeRenderMode="walking"
        routeRideSegments={[]}
        routeWalkDotCoords={[]}
      />,
    );

    expect(queryByTestId("route-polyline")).toBeNull();
  });

  it("renders walking route polyline", () => {
    const { getByTestId } = render(
      <RouteOverlay
        safeRouteCoords={[coordA, coordB]}
        routeRenderMode="walking"
        routeRideSegments={[]}
        routeWalkDotCoords={[walkDot]}
      />,
    );

    expect(getByTestId("route-polyline")).toBeTruthy();
  });

  it("renders mixed route with first ride segment as route-polyline", () => {
    const { getByTestId } = render(
      <RouteOverlay
        safeRouteCoords={[coordA, coordB]}
        routeRenderMode="mixed"
        routeRideSegments={[[coordA, coordB]]}
        routeWalkDotCoords={[walkDot]}
      />,
    );

    expect(getByTestId("route-polyline")).toBeTruthy();
  });

  it("renders default solid polyline for non-walking non-mixed mode", () => {
    const { getByTestId } = render(
      <RouteOverlay
        safeRouteCoords={[coordA, coordB]}
        routeRenderMode="solid"
        routeRideSegments={[]}
        routeWalkDotCoords={[]}
      />,
    );

    expect(getByTestId("route-polyline")).toBeTruthy();
  });
});
