import React from "react";
import PropTypes from "prop-types";
import { View, Text, Pressable } from "react-native";

const MAROON = "#912338";

/**
 * Pure presentation component for room selection bar
 * Shows selected room info and get directions button
 * Displayed when a room is selected in indoor map
 */
function RoomSelectionBar({
  selectedRoom,
  selectedRoomContext,
  onGetDirections,
  styles,
}) {
  if (!selectedRoom) return null;

  return (
    <View style={styles.selectedRoomBar}>
      <View style={styles.selectedRoomInfo}>
        <Text style={styles.selectedRoomCheck}>✓</Text>
        <View>
          <Text style={styles.selectedRoomText}>Room Selected</Text>
          <Text style={styles.selectedRoomDetail}>
            {selectedRoom.label || "Unknown"} · Floor{" "}
            {selectedRoomContext?.floor?.label || "?"} ·{" "}
            {selectedRoomContext?.building?.name || "Unknown"}
          </Text>
        </View>
      </View>
      <Pressable style={styles.getDirectionsButton} onPress={onGetDirections}>
        <Text style={styles.getDirectionsText}>Get Directions</Text>
      </Pressable>
    </View>
  );
}

RoomSelectionBar.propTypes = {
  selectedRoom: PropTypes.shape({
    label: PropTypes.string,
  }),
  selectedRoomContext: PropTypes.shape({
    floor: PropTypes.shape({
      label: PropTypes.string,
    }),
    building: PropTypes.shape({
      name: PropTypes.string,
    }),
  }),
  onGetDirections: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(RoomSelectionBar);
