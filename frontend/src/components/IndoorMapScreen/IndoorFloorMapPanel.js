import React from "react";
import PropTypes from "prop-types";
import { View, Image, ScrollView, Text } from "react-native";
import IndoorPoiMarkers from "../IndoorPoiMarkers";

/**
 * Pure presentation component for indoor floor map panel
 * Displays floor plan image with POI markers and room highlights
 * Shows fallback message when floor image is not available
 * All rendering logic, no state management
 */
function IndoorFloorMapPanel({
  currentFloor,
  inspectMode,
  selectedRoomHighlight,
  styles,
  onInspectModeChange,
}) {
  if (!currentFloor?.image) {
    return (
      <View style={styles.floorPlanContainer}>
        <Text style={styles.floorPlanNotAvailableText}>
          Floor plan not available
        </Text>
      </View>
    );
  }

  const imageStyle = inspectMode
    ? [styles.floorPlanImage, styles.floorPlanImageInspect]
    : styles.floorPlanImage;

  const renderFloorPlanCanvas = () => (
    <View style={styles.floorPlanCanvas}>
      <Image
        source={currentFloor.image}
        style={imageStyle}
        resizeMode="contain"
      />
      <IndoorPoiMarkers
        pois={currentFloor?.pois || []}
        markerStyle={styles.poiMarker}
        positionForPoi={(poi) => ({
          left: `${(poi.x / (currentFloor.width || 1000)) * 100}%`,
          top: `${(poi.y / (currentFloor.height || 1000)) * 100}%`,
        })}
        testIdPrefix="poi-marker"
        iconColor="#912338"
      />
      {selectedRoomHighlight && (
        <View
          testID="selected-room-highlight"
          style={[
            styles.roomHighlight,
            {
              left: `${(selectedRoomHighlight.x / 1000) * 100}%`,
              top: `${(selectedRoomHighlight.y / 1000) * 100}%`,
            },
          ]}
        />
      )}
    </View>
  );

  return (
    <View style={styles.floorPlanContainer}>
      {inspectMode ? (
        <ScrollView
          horizontal
          contentContainerStyle={styles.floorPlanScrollContent}
          showsHorizontalScrollIndicator={false}
        >
          <ScrollView
            contentContainerStyle={styles.floorPlanScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderFloorPlanCanvas()}
          </ScrollView>
        </ScrollView>
      ) : (
        <View style={styles.floorPlanScrollContent}>
          {renderFloorPlanCanvas()}
        </View>
      )}
    </View>
  );
}

IndoorFloorMapPanel.propTypes = {
  currentFloor: PropTypes.shape({
    image: PropTypes.oneOfType([PropTypes.number, PropTypes.object]),
    width: PropTypes.number,
    height: PropTypes.number,
    pois: PropTypes.array,
  }),
  inspectMode: PropTypes.bool.isRequired,
  selectedRoomHighlight: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
  styles: PropTypes.object.isRequired,
  onInspectModeChange: PropTypes.func,
};

export default React.memo(IndoorFloorMapPanel);
