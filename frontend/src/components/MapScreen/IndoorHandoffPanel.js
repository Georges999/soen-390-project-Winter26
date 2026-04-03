import React from "react";
import PropTypes from "prop-types";
import { View, Pressable, Text } from "react-native";

/**
 * Pure presentation component for indoor directions handoff button
 * Shows when user selects an indoor room and wants to navigate to indoor directions
 */
function IndoorHandoffPanel({ isVisible, onPress, styles }) {
  if (!isVisible) return null;

  return (
    <View style={styles.indoorHandoffWrap}>
      <Pressable
        testID="indoor-handoff-button"
        style={styles.indoorHandoffButton}
        onPress={onPress}
      >
        <Text style={styles.indoorHandoffButtonText}>
          Go to Indoor Directions
        </Text>
      </Pressable>
    </View>
  );
}

//specifies that the component expects exactly 3 props so incase any missing, react will send warning
IndoorHandoffPanel.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onPress: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(IndoorHandoffPanel);
