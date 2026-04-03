import React from "react";
import PropTypes from "prop-types";
import { Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Pure presentation component for POI toggle button
 * Floating button to open/close outdoor POI panel
 * All state managed by parent component
 */
function POIButton({ isOpen, isClearFilterPanel, onPress, styles }) {
  return (
    <Pressable
      testID="poi-button"
      accessibilityLabel="Outdoor points of interest"
      hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      onPress={onPress}
      style={[
        styles.poiButton,
        isOpen && styles.poiButtonActive,
        isOpen && isClearFilterPanel && styles.poiButtonClearFilterPanel,
      ]}
    >
      <MaterialIcons
        name="info-outline"
        size={22}
        style={styles.poiButtonIcon}
      />
    </Pressable>
  );
}

POIButton.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  isClearFilterPanel: PropTypes.bool.isRequired,
  onPress: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(POIButton);
