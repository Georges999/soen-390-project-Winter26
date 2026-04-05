import React from "react";
import PropTypes from "prop-types";
import { Pressable, ScrollView, Text, View } from "react-native";

const buildSelectorStyles = (baseStyle, activeStyle, isActive, disabledStyle, disabled) => [
  baseStyle,
  isActive && activeStyle,
  disabled && disabledStyle,
];

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
            testID={`indoor-campus-${campusId}`}
            style={buildSelectorStyles(
              styles.campusButton,
              styles.campusButtonActive,
              isSelected,
              styles.selectorDisabled,
              disabled,
            )}
            disabled={disabled}
            onPress={() => onSelectCampus(campusId)}
          >
            <Text style={buildSelectorStyles(
              styles.campusButtonText,
              styles.campusButtonTextActive,
              isSelected,
              null,
              false,
            )}>
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
          testID={`indoor-building-${building.id}`}
          style={buildSelectorStyles(
            styles.buildingChip,
            styles.buildingChipActive,
            selectedBuildingIdx === idx,
            styles.selectorDisabled,
            disabled,
          )}
          disabled={disabled}
          onPress={() => onSelectBuilding(idx)}
        >
          <Text style={buildSelectorStyles(
            styles.buildingChipText,
            styles.buildingChipTextActive,
            selectedBuildingIdx === idx,
            null,
            false,
          )}>
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
          testID={`indoor-floor-${floor.id}`}
          style={buildSelectorStyles(
            styles.floorButton,
            styles.floorButtonActive,
            selectedFloorIdx === idx,
            styles.selectorDisabled,
            disabled,
          )}
          disabled={disabled}
          onPress={() => onSelectFloor(idx)}
        >
          <Text style={buildSelectorStyles(
            styles.floorButtonText,
            styles.floorButtonTextActive,
            selectedFloorIdx === idx,
            null,
            false,
          )}>
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
