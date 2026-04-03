import React from "react";
import PropTypes from "prop-types";
import { View, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const MAROON = "#95223D";

/**
 * Pure presentation component for map recenter button
 * Displays a floating button to recenter map on user location or route
 * No state management - all callbacks passed as props
 */
function RecenterButton({ isVisible, bottomOffset, onPress, styles }) {
  if (!isVisible) return null;

  return (
    <Pressable
      testID="recenter-button"
      style={[styles.recenterBtn, { bottom: bottomOffset }]}
      onPress={onPress}
    >
      <MaterialIcons name="my-location" size={24} color={MAROON} />
    </Pressable>
  );
}

RecenterButton.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  bottomOffset: PropTypes.number.isRequired,
  onPress: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(RecenterButton);
