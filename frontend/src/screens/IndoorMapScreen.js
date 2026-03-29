import React, { useState, useMemo } from "react";
import PropTypes from "prop-types";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildings } from "../data/indoorFloorData";
import IndoorPoiLegend from "../components/IndoorPoiLegend";
import IndoorPoiMarkers from "../components/IndoorPoiMarkers";
import {
  IndoorBuildingSelector,
  IndoorCampusToggle,
  IndoorFloorSelector,
} from "../components/IndoorSelectors";
import { getRoomHighlightPoint } from "../data/indoorRoomHighlightData";
import {
  buildAllRooms,
  getFilteredRooms,
  getRoomSelectionIndexes,
  getSelectedRoomContext,
} from "../utils/indoorMapUtils";
import {
  indoorPoiLegendStyles,
  indoorPoiMarkerStyle,
} from "../styles/indoorSharedStyles";

const MAROON = "#912338";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAP_IMAGE_WIDTH = SCREEN_WIDTH - 32;
const MAP_IMAGE_HEIGHT = SCREEN_WIDTH - 60;
const MAP_INSPECT_SCALE = 1.45;

function IndoorMapScreen({ navigation }) {
  // Campus toggle: "sgw" or "loyola"
  const [selectedCampus, setSelectedCampus] = useState("sgw");
  // Currently selected building index within campus
  const [selectedBuildingIdx, setSelectedBuildingIdx] = useState(0);
  // Currently selected floor index within building
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(0);
  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  // Selected room
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [inspectMode, setInspectMode] = useState(false);

  // Get available buildings for selected campus
  const campusBuildings = useMemo(
    () => buildings[selectedCampus] || [],
    [selectedCampus]
  );

  // Current building
  const currentBuilding = campusBuildings[selectedBuildingIdx] || campusBuildings[0];

  // Current floor
  const currentFloor = currentBuilding?.floors?.[selectedFloorIdx] || currentBuilding?.floors?.[0];

  // All rooms for search
  const allRooms = useMemo(() => buildAllRooms(campusBuildings), [campusBuildings]);

  // Filtered search results
  const searchResults = useMemo(
    () => getFilteredRooms(allRooms, searchQuery),
    [searchQuery, allRooms]
  );

  const selectedRoomContext = useMemo(() => {
    return getSelectedRoomContext(campusBuildings, selectedRoom);
  }, [campusBuildings, selectedRoom]);

  const selectedRoomHighlight = useMemo(
    () =>
      selectedRoomContext?.floor?.id === currentFloor?.id
        ? getRoomHighlightPoint(currentFloor?.id, selectedRoom?.label)
        : null,
    [currentFloor?.id, selectedRoom?.label, selectedRoomContext]
  );

  const handleCampusToggle = (campus) => {
    setSelectedCampus(campus);
    setSelectedBuildingIdx(0);
    setSelectedFloorIdx(0);
    setSelectedRoom(null);
    setSearchQuery("");
  };

  const handleBuildingSelect = (idx) => {
    setSelectedBuildingIdx(idx);
    setSelectedFloorIdx(0);
    setSelectedRoom(null);
  };

  const handleFloorSelect = (idx) => {
    setSelectedFloorIdx(idx);
  };

  const handleRoomSelect = (room) => {
    setSelectedRoom(room);
    setSearchQuery("");

    const selectionIndexes = getRoomSelectionIndexes(campusBuildings, room);
    if (!selectionIndexes) return;

    setSelectedBuildingIdx(selectionIndexes.buildingIdx);
    if (selectionIndexes.floorIdx >= 0) {
      setSelectedFloorIdx(selectionIndexes.floorIdx);
    }
  };

  const handleGetDirections = () => {
    if (!selectedRoom || !selectedRoomContext) return;

    navigation.navigate("IndoorDirections", {
      destinationRoom: selectedRoom,
      building: selectedRoomContext.building,
      floor: selectedRoomContext.floor,
    });
  };

  const renderRoomHighlightMarker = () => {
    if (!selectedRoomHighlight) return null;

    return (
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
    );
  };

  const renderFloorPlanCanvas = (imageStyle) => (
    <View style={styles.floorPlanCanvas}>
      <Image source={currentFloor.image} style={imageStyle} resizeMode="contain" />
      <IndoorPoiMarkers
        pois={currentFloor?.pois || []}
        markerStyle={styles.poiMarker}
        positionForPoi={(poi) => ({
          left: `${(poi.x / (currentFloor.width || 1000)) * 100}%`,
          top: `${(poi.y / (currentFloor.height || 1000)) * 100}%`,
        })}
        testIdPrefix="poi-marker"
        iconColor={MAROON}
      />
      {renderRoomHighlightMarker()}
    </View>
  );

  const renderFloorPlanContent = () => {
    if (!currentFloor?.image) {
      return (
        <View style={styles.noFloorPlan}>
          <MaterialIcons name="map" size={48} color="#ccc" />
          <Text style={styles.noFloorPlanText}>
            Floor plan not available
          </Text>
        </View>
      );
    }

    if (inspectMode) {
      return (
        <ScrollView
          horizontal
          contentContainerStyle={styles.floorPlanScrollContent}
          showsHorizontalScrollIndicator={false}
        >
          <ScrollView
            contentContainerStyle={styles.floorPlanScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderFloorPlanCanvas([styles.floorPlanImage, styles.floorPlanImageInspect])}
          </ScrollView>
        </ScrollView>
      );
    }

    return (
      <View style={styles.floorPlanScrollContent}>
        {renderFloorPlanCanvas(styles.floorPlanImage)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={28} color={MAROON} />
          </Pressable>
          <Text style={styles.headerTitle}>Indoor Map</Text>
        </View>

        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Campus Toggle */}
        <IndoorCampusToggle
          selectedCampus={selectedCampus}
          onSelectCampus={handleCampusToggle}
          styles={styles}
        />

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search room or click on map"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={10}>
              <MaterialIcons name="close" size={18} color="#999" />
            </Pressable>
          )}
        </View>

        {/* Search Results Dropdown */}
        {searchQuery.trim().length > 0 && (
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
                    onPress={() => handleRoomSelect(item)}
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
            onSelectBuilding={handleBuildingSelect}
            styles={styles}
          />
        )}

        {/* Floor Label */}
        {currentFloor && (
          <View style={styles.floorLabelContainer}>
            <View style={styles.floorLabelBadge}>
              <Text style={styles.floorLabelText}>
                Floor {currentFloor.label}
              </Text>
            </View>
            <Pressable
              style={[
                styles.inspectToggle,
                inspectMode && styles.inspectToggleActive,
              ]}
              onPress={() => setInspectMode((prev) => !prev)}
            >
              <MaterialIcons
                name={inspectMode ? "zoom-out-map" : "zoom-in"}
                size={14}
                color={inspectMode ? "#fff" : MAROON}
              />
              <Text
                style={[
                  styles.inspectToggleText,
                  inspectMode && styles.inspectToggleTextActive,
                ]}
              >
                {inspectMode ? "Inspecting map" : "Inspect map"}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Floor Plan Image */}
        <View style={styles.floorPlanContainer}>
          {renderFloorPlanContent()}
        </View>

        {/* POI Legend */}
        <IndoorPoiLegend styles={styles} iconColor={MAROON} />

        {/* Selected Room + Get Directions */}
        {selectedRoom && (
          <View style={styles.selectedRoomBar}>
            <View style={styles.selectedRoomInfo}>
              <Text style={styles.selectedRoomCheck}>✓</Text>
              <View>
                <Text style={styles.selectedRoomText}>Room Selected</Text>
                <Text style={styles.selectedRoomDetail}>
                  {selectedRoom.label || "Unknown"} · Floor {currentFloor?.label || "?"} · {currentBuilding?.name || "Unknown"}
                </Text>
              </View>
            </View>
            <Pressable style={styles.getDirectionsButton} onPress={handleGetDirections}>
              <Text style={styles.getDirectionsText}>Get Directions</Text>
            </Pressable>
          </View>
        )}

        {/* Floor Selector */}
        {currentBuilding?.floors && (
          <IndoorFloorSelector
            floors={currentBuilding.floors}
            selectedFloorIdx={selectedFloorIdx}
            onSelectFloor={handleFloorSelect}
            styles={styles}
          />
        )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

IndoorMapScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default IndoorMapScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: MAROON,
  },
  backButton: {
    padding: 4,
    marginRight: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    fontStyle: "italic",
  },

  // Campus Toggle
  campusToggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 12,
  },
  campusButton: {
    paddingVertical: 10,
    paddingHorizontal: 36,
    borderRadius: 8,
    backgroundColor: "#f0d0d7",
    borderWidth: 2,
    borderColor: MAROON,
  },
  campusButtonActive: {
    backgroundColor: MAROON,
  },
  campusButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: MAROON,
  },
  campusButtonTextActive: {
    color: "#fff",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333",
  },
  searchResultsContainer: {
    position: "absolute",
    top: 155,
    left: 16,
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    zIndex: 100,
    maxHeight: 200,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchResultsScroll: {
    maxHeight: 200,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultText: {
    fontSize: 15,
    color: "#333",
  },

  // Building Selector
  buildingSelectorContainer: {
    maxHeight: 44,
    marginBottom: 4,
  },
  buildingSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  buildingChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buildingChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
  },
  buildingChipTextActive: {
    color: "#fff",
  },

  // Floor Label
  floorLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  floorLabelBadge: {
    alignSelf: "flex-start",
    backgroundColor: MAROON,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  floorLabelText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  inspectToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(145, 35, 56, 0.35)",
    backgroundColor: "#fff",
  },
  inspectToggleActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  inspectToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: MAROON,
  },
  inspectToggleTextActive: {
    color: "#fff",
  },

  // Floor Plan
  floorPlanContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9f5ef",
    borderWidth: 1,
    borderColor: "#e0d8ce",
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  floorPlanScrollContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  floorPlanImage: {
    width: MAP_IMAGE_WIDTH,
    height: MAP_IMAGE_HEIGHT,
  },
  floorPlanImageInspect: {
    width: MAP_IMAGE_WIDTH * MAP_INSPECT_SCALE,
    height: MAP_IMAGE_HEIGHT * MAP_INSPECT_SCALE,
  },
  floorPlanCanvas: {
    position: "relative",
  },
  poiMarker: indoorPoiMarkerStyle,
  roomHighlight: {
    position: "absolute",
    width: 18,
    height: 18,
    marginLeft: -9,
    marginTop: -9,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#2563eb",
    backgroundColor: "rgba(37, 99, 235, 0.22)",
  },
  noFloorPlan: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noFloorPlanText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  noResultsText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },

  // POI Legend
  ...indoorPoiLegendStyles,

  // Selected Room
  selectedRoomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  selectedRoomInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedRoomCheck: {
    fontSize: 16,
    color: MAROON,
    marginRight: 8,
    fontWeight: "bold",
  },
  selectedRoomText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "600",
  },
  selectedRoomDetail: {
    fontSize: 12,
    fontWeight: "400",
    color: "#666",
  },
  getDirectionsButton: {
    backgroundColor: MAROON,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  getDirectionsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Floor Selector
  floorSelectorContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  floorSelectorContent: {
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: "center",
    flexGrow: 1,
  },
  floorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  floorButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  floorButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#555",
  },
  floorButtonTextActive: {
    color: "#fff",
  },
});
