import React from "react";
import PropTypes from "prop-types";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

/**
 * Pure presentation component for POI info card
 * Displays selected POI information and get directions CTA
 * All data and callbacks passed as props
 */
function POIInfoCard({
  poi,
  lastPoiCategory,
  poiDistance,
  isPanelOpen,
  onClose,
  onGetDirections,
  getPoiInfoCardBottomOffset,
  styles,
}) {
  if (!poi) return null;

  return (
    <View
      testID="poi-info-card"
      style={[
        styles.poiInfoCardContainer,
        { bottom: getPoiInfoCardBottomOffset(isPanelOpen) },
      ]}
    >
      <View style={styles.poiInfoCard}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={styles.poiInfoTitle} numberOfLines={1}>
            {poi.name}
          </Text>
          <Pressable
            accessibilityLabel="Dismiss POI info card"
            onPress={onClose}
          >
            <MaterialIcons name="clear" size={18} color="#1F1F1F" />
          </Pressable>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 10,
          }}
        >
          <View style={styles.poiInfoTag}>
            <Text style={styles.poiInfoTagText}>{lastPoiCategory}</Text>
          </View>
          <Text style={styles.poiInfoDistance}>{poiDistance}</Text>
        </View>

        <Text style={styles.poiInfoAddress} numberOfLines={2}>
          {poi.address}
        </Text>

        <Pressable
          testID="poi-get-directions-btn"
          style={styles.poiInfoCTA}
          onPress={onGetDirections}
        >
          <Text style={styles.poiInfoCTAText}>Get Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

POIInfoCard.propTypes = {
  poi: PropTypes.shape({
    name: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired,
  }),
  lastPoiCategory: PropTypes.string.isRequired,
  poiDistance: PropTypes.string.isRequired,
  isPanelOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onGetDirections: PropTypes.func.isRequired,
  getPoiInfoCardBottomOffset: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(POIInfoCard);
