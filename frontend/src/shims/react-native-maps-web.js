import React, { forwardRef, useImperativeHandle } from "react";
import { View } from "react-native";
import PropTypes from "prop-types";

const viewPropTypes = {
  children: PropTypes.node,
};

const createShape = (displayName) => {
  const Shape = ({ children, ...props }) => <View {...props}>{children}</View>;
  Shape.displayName = displayName;
  Shape.propTypes = viewPropTypes;
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
MapView.propTypes = viewPropTypes;

export const Polygon = createShape("Polygon");
export const Polyline = createShape("Polyline");
export const Marker = createShape("Marker");
export const Circle = createShape("Circle");

export default MapView;
