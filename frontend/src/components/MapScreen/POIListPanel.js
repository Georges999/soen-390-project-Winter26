import React from "react";
import PropTypes from "prop-types";
import { View, Text, Pressable, ScrollView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import OutdoorPoiFilterForm from "../OutdoorPoiFilterForm";

/**
 * Pure presentation component for outdoor POI panel
 * Shows either filter form or list of POIs based on hasRequested state
 * All data and callbacks passed as props
 */
function POIListPanel({
  isOpen,
  hasRequested,
  isLoading,
  pois,
  onClose,
  onPoiSelect,
  onShowOnMap,
  styles,
  maroonColor,
}) {
  if (!isOpen) return null;

  let panelBodyContent;
  if (isLoading) {
    panelBodyContent = (
      <Text style={styles.poiStatusText}>Loading nearby places...</Text>
    );
  } else if (pois.length === 0) {
    panelBodyContent = (
      <Text style={styles.poiStatusText}>No nearby POIs found.</Text>
    );
  } else {
    panelBodyContent = (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {pois.map((poi, index) => (
          <Pressable
            key={`poi-row-${String(poi.id ?? "x")}-${index}`}
            testID="poi-list-item"
            onPress={() => onPoiSelect(poi)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#FFFFFF",
              borderBottomWidth: 1,
              borderBottomColor: "#E9E9E9",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.poiResultTitle} numberOfLines={1}>
                {poi.name}
              </Text>
              {typeof poi.rating === "number" ? (
                <Text
                  style={{ marginTop: 2, fontSize: 12, color: "#5C5C5C" }}
                >
                  {poi.rating.toFixed(1)} ★
                </Text>
              ) : null}
            </View>

            <Text
              style={{ fontSize: 12, fontWeight: "600", color: "#222" }}
            >
              {poi.formattedDistance}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  return (
    <View
      testID="poi-panel"
      style={
        hasRequested
          ? [
              styles.poiPanel,
              {
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                width: "100%",
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderBottomLeftRadius: 0,
                borderBottomRightRadius: 0,
                padding: 16,
                maxHeight: "40%",
                justifyContent: "flex-start",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 8,
              },
            ]
          : styles.poiPanel
      }
    >
      <View style={styles.poiPanelHeader}>
        <Text style={styles.poiPanelTitle}>Outdoor POIs</Text>
        <Pressable onPress={onClose}>
          <MaterialIcons name="close" size={20} color="#1F1F1F" />
        </Pressable>
      </View>

      {hasRequested ? (
        <View
          style={{
            marginTop: 8,
            overflow: "hidden",
            flex: 1,
          }}
        >
          {panelBodyContent}
        </View>
      ) : (
        <OutdoorPoiFilterForm
          styles={styles}
          maroon={maroonColor}
          onShowOnMap={onShowOnMap}
        />
      )}
    </View>
  );
}

POIListPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  hasRequested: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  pois: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      name: PropTypes.string.isRequired,
      rating: PropTypes.number,
      formattedDistance: PropTypes.string.isRequired,
    }),
  ).isRequired,
  onClose: PropTypes.func.isRequired,
  onPoiSelect: PropTypes.func.isRequired,
  onShowOnMap: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
  maroonColor: PropTypes.string.isRequired,
};

export default React.memo(POIListPanel);
