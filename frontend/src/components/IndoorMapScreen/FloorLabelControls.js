import React from "react";
import PropTypes from "prop-types";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const MAROON = "#912338";

/**
 * Pure presentation component for floor label and inspect mode toggle
 * Displays current floor number and toggle button for inspect mode
 */
function FloorLabelControls({
  currentFloor,
  inspectMode,
  onToggleInspect,
  styles,
}) {
  if (!currentFloor) return null;

  return (
    <View style={styles.floorLabelContainer}>
      <View testID="indoor-current-floor-badge" style={styles.floorLabelBadge}>
        <Text style={styles.floorLabelText}>Floor {currentFloor.label}</Text>
      </View>
      <Pressable
        testID="indoor-inspect-toggle"
        style={[
          styles.inspectToggle,
          inspectMode && styles.inspectToggleActive,
        ]}
        onPress={onToggleInspect}
      >
        <MaterialIcons
          name={inspectMode ? "zoom-out-map" : "zoom-in"}
          size={14}
          color={inspectMode ? "#fff" : MAROON}
        />
        <Text
          style={[
            styles.inspectToggleText,
            inspectMode && styles.inspectToggleTextActive,
          ]}
        >
          {inspectMode ? "Inspecting map" : "Inspect map"}
        </Text>
      </Pressable>
    </View>
  );
}

FloorLabelControls.propTypes = {
  currentFloor: PropTypes.shape({
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  inspectMode: PropTypes.bool.isRequired,
  onToggleInspect: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(FloorLabelControls);
