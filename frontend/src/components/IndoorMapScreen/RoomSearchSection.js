import React from "react";
import PropTypes from "prop-types";
import { View, TextInput, Pressable, ScrollView, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  IndoorBuildingSelector,
  IndoorCampusToggle,
  IndoorFloorSelector,
} from "../IndoorSelectors";

const MAROON = "#912338";

/**
 * Pure presentation component for room search and building selection
 * Includes campus toggle, search input, results dropdown, and building/floor selectors
 * All callbacks and data passed as props
 */
function RoomSearchSection({
  selectedCampus,
  selectedBuildingIdx,
  selectedFloorIdx,
  searchQuery,
  searchResults,
  campusBuildings,
  currentBuilding,
  showResults,
  onCampusChange,
  onBuildingSelect,
  onFloorSelect,
  onSearchChange,
  onSearchResultSelect,
  styles,
}) {
  return (
    <>
      {/* Campus Toggle */}
      <IndoorCampusToggle
        selectedCampus={selectedCampus}
        onSelectCampus={onCampusChange}
        styles={styles}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <MaterialIcons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search room or click on map"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange("")} hitSlop={10}>
            <MaterialIcons name="close" size={18} color="#999" />
          </Pressable>
        )}
      </View>

      {/* Search Results Dropdown */}
      {showResults && (
        <View style={styles.searchResultsContainer}>
          {searchResults.length > 0 ? (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={styles.searchResultsScroll}
              showsVerticalScrollIndicator
            >
              {searchResults.slice(0, 8).map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.searchResultItem}
                  onPress={() => onSearchResultSelect(item)}
                >
                  <Text
                    style={styles.searchResultText}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {item.label} · {item.buildingName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.noResultsContainer}>
              <MaterialIcons name="search-off" size={24} color="#999" />
              <Text style={styles.noResultsText}>
                No rooms or buildings found. Please try again.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Building Selector (if multiple buildings) */}
      {campusBuildings.length > 1 && (
        <IndoorBuildingSelector
          buildings={campusBuildings}
          selectedBuildingIdx={selectedBuildingIdx}
          onSelectBuilding={onBuildingSelect}
          styles={styles}
        />
      )}

      {/* Floor Selector */}
      {currentBuilding?.floors && (
        <IndoorFloorSelector
          floors={currentBuilding.floors}
          selectedFloorIdx={selectedFloorIdx}
          onSelectFloor={onFloorSelect}
          styles={styles}
        />
      )}
    </>
  );
}

RoomSearchSection.propTypes = {
  selectedCampus: PropTypes.string.isRequired,
  selectedBuildingIdx: PropTypes.number.isRequired,
  selectedFloorIdx: PropTypes.number.isRequired,
  searchQuery: PropTypes.string.isRequired,
  searchResults: PropTypes.array.isRequired,
  campusBuildings: PropTypes.array.isRequired,
  currentBuilding: PropTypes.object,
  showResults: PropTypes.bool.isRequired,
  onCampusChange: PropTypes.func.isRequired,
  onBuildingSelect: PropTypes.func.isRequired,
  onFloorSelect: PropTypes.func.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onSearchResultSelect: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(RoomSearchSection);
