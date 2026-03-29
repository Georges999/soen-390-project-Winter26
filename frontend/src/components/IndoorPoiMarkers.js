import React from "react";
import PropTypes from "prop-types";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { POI_ICONS } from "../data/indoorFloorData";

const FALLBACK_POI_ICON = "place";

export default function IndoorPoiMarkers({
  iconColor,
  iconSize = 10,
  markerStyle,
  pois,
  positionForPoi,
  testIdPrefix,
}) {
  return pois.map((poi) => {
    if (poi.x === undefined || poi.y === undefined) return null;

    const iconName = POI_ICONS[poi.type]?.icon || FALLBACK_POI_ICON;

    return (
      <View
        key={poi.id}
        testID={`${testIdPrefix}-${poi.id}`}
        style={[markerStyle, positionForPoi(poi)]}
      >
        <MaterialIcons
          testID={`${testIdPrefix}-icon-${poi.id}`}
          name={iconName}
          size={iconSize}
          color={iconColor}
        />
      </View>
    );
  });
}

IndoorPoiMarkers.propTypes = {
  iconColor: PropTypes.string.isRequired,
  iconSize: PropTypes.number,
  markerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number]).isRequired,
  pois: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      type: PropTypes.string,
      x: PropTypes.number,
      y: PropTypes.number,
    })
  ).isRequired,
  positionForPoi: PropTypes.func.isRequired,
  testIdPrefix: PropTypes.string.isRequired,
};
