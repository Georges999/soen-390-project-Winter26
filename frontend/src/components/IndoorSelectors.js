import React from "react";
import PropTypes from "prop-types";
import { Pressable, ScrollView, Text, View } from "react-native";

export function IndoorCampusToggle({
  selectedCampus,
  onSelectCampus,
  styles,
  disabled = false,
}) {
  return (
    <View style={styles.campusToggleContainer}>
      {["sgw", "loyola"].map((campusId) => {
        const isSelected = selectedCampus === campusId;

        return (
          <Pressable
            key={campusId}
            style={[
              styles.campusButton,
              isSelected && styles.campusButtonActive,
              disabled && styles.selectorDisabled,
            ]}
            disabled={disabled}
            onPress={() => onSelectCampus(campusId)}
          >
            <Text
              style={[
                styles.campusButtonText,
                isSelected && styles.campusButtonTextActive,
              ]}
            >
              {campusId === "sgw" ? "SGW" : "Loyola"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IndoorBuildingSelector({
  buildings,
  selectedBuildingIdx,
  onSelectBuilding,
  styles,
  disabled = false,
  containerStyle,
}) {
  if (buildings.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.buildingSelectorContent}
      style={containerStyle ?? styles.buildingSelectorContainer}
    >
      {buildings.map((building, idx) => (
        <Pressable
          key={building.id}
          style={[
            styles.buildingChip,
            selectedBuildingIdx === idx && styles.buildingChipActive,
            disabled && styles.selectorDisabled,
          ]}
          disabled={disabled}
          onPress={() => onSelectBuilding(idx)}
        >
          <Text
            style={[
              styles.buildingChipText,
              selectedBuildingIdx === idx && styles.buildingChipTextActive,
            ]}
          >
            {building.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function IndoorFloorSelector({
  floors,
  selectedFloorIdx,
  onSelectFloor,
  styles,
  disabled = false,
  containerStyle,
}) {
  if (!floors?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.floorSelectorContent}
      style={containerStyle ?? styles.floorSelectorContainer}
    >
      {floors.map((floor, idx) => (
        <Pressable
          key={floor.id}
          style={[
            styles.floorButton,
            selectedFloorIdx === idx && styles.floorButtonActive,
            disabled && styles.selectorDisabled,
          ]}
          disabled={disabled}
          onPress={() => onSelectFloor(idx)}
        >
          <Text
            style={[
              styles.floorButtonText,
              selectedFloorIdx === idx && styles.floorButtonTextActive,
            ]}
          >
            {floor.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const sharedStylesPropType = PropTypes.shape({
  buildingChip: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  buildingChipActive: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  buildingChipText: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  buildingChipTextActive: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  buildingSelectorContainer: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  buildingSelectorContent: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  campusButton: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  campusButtonActive: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  campusButtonText: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  campusButtonTextActive: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  campusToggleContainer: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  floorButton: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  floorButtonActive: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  floorButtonText: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  floorButtonTextActive: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  floorSelectorContainer: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  floorSelectorContent: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  selectorDisabled: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
});

IndoorCampusToggle.propTypes = {
  disabled: PropTypes.bool,
  onSelectCampus: PropTypes.func.isRequired,
  selectedCampus: PropTypes.string.isRequired,
  styles: sharedStylesPropType.isRequired,
};

IndoorBuildingSelector.propTypes = {
  buildings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  disabled: PropTypes.bool,
  onSelectBuilding: PropTypes.func.isRequired,
  selectedBuildingIdx: PropTypes.number.isRequired,
  styles: sharedStylesPropType.isRequired,
};

IndoorFloorSelector.propTypes = {
  containerStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.number]),
  disabled: PropTypes.bool,
  floors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  onSelectFloor: PropTypes.func.isRequired,
  selectedFloorIdx: PropTypes.number.isRequired,
  styles: sharedStylesPropType.isRequired,
};

IndoorFloorSelector.defaultProps = {
  floors: [],
};
