import React, { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";

const createShape = (displayName) => {
  const Shape = ({ children, ...props }) => <View {...props}>{children}</View>;
  Shape.displayName = displayName;
  return Shape;
};

const MapView = forwardRef(({ children, ...props }, ref) => {
  useImperativeHandle(ref, () => ({
    animateToRegion() {},
    fitToCoordinates() {},
  }));

  return <View {...props}>{children}</View>;
});

MapView.displayName = "MapView";

export const Polygon = createShape("Polygon");
export const Polyline = createShape("Polyline");
export const Marker = createShape("Marker");
export const Circle = createShape("Circle");

export default MapView;
