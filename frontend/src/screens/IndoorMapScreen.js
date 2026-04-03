import React, { useState, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { buildings } from "../data/indoorFloorData";
import IndoorPoiLegend from "../components/IndoorPoiLegend";
import {
  IndoorBuildingSelector,
  IndoorCampusToggle,
  IndoorFloorSelector,
} from "../components/IndoorSelectors";
import FloorLabelControls from "../components/IndoorMapScreen/FloorLabelControls";
import IndoorFloorMapPanel from "../components/IndoorMapScreen/IndoorFloorMapPanel";
import RoomSearchSection from "../components/IndoorMapScreen/RoomSearchSection";
import RoomSelectionBar from "../components/IndoorMapScreen/RoomSelectionBar";
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
    [selectedCampus],
  );

  // Current building
  const currentBuilding =
    campusBuildings[selectedBuildingIdx] || campusBuildings[0];

  // Current floor
  const currentFloor =
    currentBuilding?.floors?.[selectedFloorIdx] || currentBuilding?.floors?.[0];

  // All rooms for search
  const allRooms = useMemo(
    () => buildAllRooms(campusBuildings),
    [campusBuildings],
  );

  // Filtered search results
  const searchResults = useMemo(
    () =>
      getFilteredRooms(allRooms, searchQuery, {
        preferredBuildingId: currentBuilding?.id,
        preferredCampusId: selectedCampus,
      }),
    [searchQuery, allRooms, currentBuilding?.id, selectedCampus],
  );

  const selectedRoomContext = useMemo(() => {
    return getSelectedRoomContext(buildings, selectedRoom);
  }, [selectedRoom]);

  const selectedRoomHighlight = useMemo(
    () =>
      selectedRoomContext?.floor?.id === currentFloor?.id
        ? getRoomHighlightPoint(currentFloor?.id, selectedRoom)
        : null,
    [currentFloor?.id, selectedRoom, selectedRoomContext],
  );

  useEffect(() => {
    if (!selectedRoom) return;

    const hasLeftSelectedRoomBuilding =
      !selectedRoomContext ||
      selectedRoomContext.campusId !== selectedCampus ||
      selectedRoomContext.building?.id !== currentBuilding?.id;

    if (hasLeftSelectedRoomBuilding) {
      setSelectedRoom(null);
    }
  }, [currentBuilding?.id, selectedCampus, selectedRoom, selectedRoomContext]);

  const handleCampusToggle = (campus) => {
    setSelectedCampus(campus);
    setSelectedBuildingIdx(0);
    setSelectedFloorIdx(0);
    setSearchQuery("");
  };

  const handleBuildingSelect = (idx) => {
    setSelectedBuildingIdx(idx);
    setSelectedFloorIdx(0);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialIcons name="chevron-left" size={28} color={MAROON} />
          </Pressable>
          <Text style={styles.headerTitle}>Indoor Map</Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Room Search Section - Campus Toggle, Search Bar, Results, Building/Floor Selectors */}
          <RoomSearchSection
            selectedCampus={selectedCampus}
            selectedBuildingIdx={selectedBuildingIdx}
            selectedFloorIdx={selectedFloorIdx}
            searchQuery={searchQuery}
            searchResults={searchResults}
            campusBuildings={campusBuildings}
            currentBuilding={currentBuilding}
            showResults={searchQuery.trim().length > 0}
            onCampusChange={handleCampusToggle}
            onBuildingSelect={handleBuildingSelect}
            onFloorSelect={handleFloorSelect}
            onSearchChange={setSearchQuery}
            onSearchResultSelect={handleRoomSelect}
            styles={styles}
          />

          {/* Floor Label and Inspect Toggle */}
          <FloorLabelControls
            currentFloor={currentFloor}
            inspectMode={inspectMode}
            onToggleInspect={() => setInspectMode((prev) => !prev)}
            styles={styles}
          />

          {/* Floor Plan Display with Room Highlights */}
          <IndoorFloorMapPanel
            currentFloor={currentFloor}
            inspectMode={inspectMode}
            selectedRoomHighlight={selectedRoomHighlight}
            styles={styles}
            onInspectModeChange={setInspectMode}
          />

          {/* POI Legend */}
          <IndoorPoiLegend styles={styles} iconColor={MAROON} />

          {/* Room Selection Bar with Get Directions Button */}
          <RoomSelectionBar
            selectedRoom={selectedRoom}
            selectedRoomContext={selectedRoomContext}
            onGetDirections={handleGetDirections}
            styles={styles}
          />
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
  floorPlanNotAvailableText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "500",
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
