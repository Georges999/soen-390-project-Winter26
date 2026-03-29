import React from "react";
import PropTypes from "prop-types";
import { ScrollView, Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { POI_ICONS } from "../data/indoorFloorData";

export default function IndoorPoiLegend({ styles, iconColor }) {
  return (
    <ScrollView
      horizontal
      style={styles.poiLegendScroll}
      contentContainerStyle={styles.poiLegend}
      showsHorizontalScrollIndicator={false}
    >
      {Object.entries(POI_ICONS).map(([key, { icon, label }]) => (
        <View key={key} style={styles.poiLegendItem}>
          <MaterialIcons name={icon} size={18} color={iconColor} />
          <Text style={styles.poiLabel}>{label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

IndoorPoiLegend.propTypes = {
  iconColor: PropTypes.string.isRequired,
  styles: PropTypes.shape({
    poiLabel: PropTypes.oneOfType([PropTypes.object, PropTypes.number]).isRequired,
    poiLegend: PropTypes.oneOfType([PropTypes.object, PropTypes.number]).isRequired,
    poiLegendItem: PropTypes.oneOfType([PropTypes.object, PropTypes.number]).isRequired,
    poiLegendScroll: PropTypes.oneOfType([PropTypes.object, PropTypes.number]).isRequired,
  }).isRequired,
};
