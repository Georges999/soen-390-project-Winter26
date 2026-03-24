import React, { memo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import PropTypes from "prop-types";
import { categoryToType } from "../services/poiService";

function getPOIFetchRadius(mode, radius) {
  return mode === "range" ? radius : Math.max(radius, 2000);
}

/**
 * Local state keeps category / mode / radius updates from re-rendering MapScreen
 * (and MapView), which avoids native crashes on some Android builds when the map
 * reconciles hundreds of polygons/markers on every chip tap.
 */
function OutdoorPoiFilterForm({ styles, maroon, onShowOnMap }) {
  const [selectedPOICategory, setSelectedPOICategory] = useState("Coffee");
  const [poiFilterMode, setPOIFilterMode] = useState("nearest");
  const [poiRadius, setPOIRadius] = useState(1000);

  return (
    <>
      <Text style={styles.poiPanelSectionLabel}>Find nearby</Text>

      <View style={styles.poiCategoryRow}>
        {["nearest", "range"].map((mode) => {
          const isSelected = poiFilterMode === mode;
          return (
            <Pressable
              key={mode}
              onPress={() => setPOIFilterMode(mode)}
              style={[
                styles.poiCategoryChip,
                isSelected && styles.poiCategoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.poiCategoryChipText,
                  isSelected && styles.poiCategoryChipTextActive,
                ]}
              >
                {mode === "nearest" ? "Nearest" : "Range"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.poiPanelSectionLabel}>
        {poiFilterMode === "nearest" ? "Show nearest" : "Range (meters)"}
      </Text>

      {poiFilterMode === "range" ? (
        <View style={styles.poiRadiusRow}>
          <Pressable
            onPress={() => {
              const nextRadius = Math.max(100, poiRadius - 100);
              setPOIRadius(nextRadius);
            }}
            style={styles.poiRadiusButton}
          >
            <Text style={styles.poiRadiusButtonText}>-</Text>
          </Pressable>

          <View style={styles.poiRadiusValueBox}>
            <Text style={styles.poiRadiusValueText}>{poiRadius}</Text>
          </View>

          <Pressable
            onPress={() => {
              const nextRadius = poiRadius + 100;
              setPOIRadius(nextRadius);
            }}
            style={styles.poiRadiusButton}
          >
            <Text style={styles.poiRadiusButtonText}>+</Text>
          </Pressable>
        </View>
      ) : null}

      <Text style={styles.poiPanelSectionLabel}>Category</Text>

      <View style={styles.poiCategoryRow}>
        {Object.keys(categoryToType).map((category) => {
          const isSelected = selectedPOICategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => setSelectedPOICategory(category)}
              style={[
                styles.poiCategoryChip,
                isSelected && styles.poiCategoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.poiCategoryChipText,
                  isSelected && styles.poiCategoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() =>
          onShowOnMap({
            category: selectedPOICategory,
            mode: poiFilterMode,
            radius: poiRadius,
            fetchRadius: getPOIFetchRadius(poiFilterMode, poiRadius),
          })
        }
        style={{
          backgroundColor: maroon,
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
        }}
      >
        <Text
          style={{
            color: "white",
            fontWeight: "700",
            fontSize: 15,
          }}
        >
          Show on map
        </Text>
      </Pressable>
    </>
  );
}

OutdoorPoiFilterForm.propTypes = {
  styles: PropTypes.object.isRequired,
  maroon: PropTypes.string.isRequired,
  onShowOnMap: PropTypes.func.isRequired,
};

export default memo(OutdoorPoiFilterForm);
