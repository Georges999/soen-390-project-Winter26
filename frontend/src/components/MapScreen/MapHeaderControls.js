import React from 'react';
import PropTypes from 'prop-types';
import { View, Text } from 'react-native';

/**
 * Pure presentation component for MapScreen header controls
 * Shows subtitle on first visit and displays current building info
 * Receives all data as props - no state management
 */
function MapHeaderControls({
  hasInteracted,
  currentBuilding,
  getBuildingName,
  styles,
}) {
  return (
    <View style={styles.header}>
      {!hasInteracted && (
        <Text style={styles.subtitle}>
          Choose a campus to explore buildings and get directions
        </Text>
      )}
      {currentBuilding && (
        <Text style={styles.currentBuildingText}>
          Current building: {getBuildingName(currentBuilding)}
        </Text>
      )}
    </View>
  );
}

MapHeaderControls.propTypes = {
  hasInteracted: PropTypes.bool.isRequired,
  currentBuilding: PropTypes.shape({
    __campusId: PropTypes.string,
  }),
  getBuildingName: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(MapHeaderControls);
