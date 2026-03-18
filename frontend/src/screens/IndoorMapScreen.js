import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  SafeAreaView,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { buildings, POI_ICONS } from "../data/indoorFloorData";
import { getRoomHighlightPoint } from "../data/indoorRoomHighlightData";

const MAROON = "#912338";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function IndoorMapScreen({ navigation }) {
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
  const allRooms = useMemo(() => {
    const rooms = [];
    campusBuildings.forEach((building) => {
      building.rooms.forEach((room) => {
        rooms.push({ ...room, buildingName: building.name, buildingId: building.id });
      });
    });
    return rooms;
  }, [campusBuildings]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const normalizedQuery = searchQuery.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return allRooms.filter(
      (r) =>
        (r.label || "").toLowerCase().includes(q) ||
        (r.id || "").toLowerCase().includes(q) ||
        (r.buildingName || "").toLowerCase().includes(q) ||
        (r.searchKeys || []).some((key) => key.includes(normalizedQuery))
    );
  }, [searchQuery, allRooms]);

  const selectedRoomContext = useMemo(() => {
    if (!selectedRoom) return null;

    const building = campusBuildings.find((candidate) =>
      candidate.rooms.some((room) => room.id === selectedRoom.id)
    );
    if (!building) return null;

    const floor = building.floors.find(
      (candidate) => candidate.id === selectedRoom.floor
    );

    return { building, floor };
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

    // Find which building and floor this room belongs to
    const buildingIdx = campusBuildings.findIndex((b) => b.id === room.buildingId);
    if (buildingIdx >= 0) {
      setSelectedBuildingIdx(buildingIdx);
      const building = campusBuildings[buildingIdx];
      const floorIdx = building.floors.findIndex((f) => f.id === room.floor);
      if (floorIdx >= 0) {
        setSelectedFloorIdx(floorIdx);
      }
    }
  };

  const handleGetDirections = () => {
    if (selectedRoom && selectedRoomContext) {
      navigation.navigate("IndoorDirections", {
        destinationRoom: selectedRoom,
        building: selectedRoomContext.building,
        floor: selectedRoomContext.floor,
      });
    }
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

        {/* Campus Toggle */}
        <View style={styles.campusToggleContainer}>
          <Pressable
            style={[
              styles.campusButton,
              selectedCampus === "sgw" && styles.campusButtonActive,
            ]}
            onPress={() => handleCampusToggle("sgw")}
          >
            <Text
              style={[
                styles.campusButtonText,
                selectedCampus === "sgw" && styles.campusButtonTextActive,
              ]}
            >
              SGW
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.campusButton,
              selectedCampus === "loyola" && styles.campusButtonActive,
            ]}
            onPress={() => handleCampusToggle("loyola")}
          >
            <Text
              style={[
                styles.campusButtonText,
                selectedCampus === "loyola" && styles.campusButtonTextActive,
              ]}
            >
              Loyola
            </Text>
          </Pressable>
        </View>

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
              <FlatList
                data={searchResults.slice(0, 8)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.searchResultItem}
                    onPress={() => handleRoomSelect(item)}
                  >
                    <Text style={styles.searchResultText}>
                      {item.label} · {item.buildingName}
                    </Text>
                  </Pressable>
                )}
                keyboardShouldPersistTaps="handled"
              />
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.buildingSelectorContainer}
            contentContainerStyle={styles.buildingSelectorContent}
          >
            {campusBuildings.map((building, idx) => (
              <Pressable
                key={building.id}
                style={[
                  styles.buildingChip,
                  selectedBuildingIdx === idx && styles.buildingChipActive,
                ]}
                onPress={() => handleBuildingSelect(idx)}
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
        )}

        {/* Floor Label */}
        {currentFloor && (
          <View style={styles.floorLabelContainer}>
            <View style={styles.floorLabelBadge}>
              <Text style={styles.floorLabelText}>
                Floor {currentFloor.label}
              </Text>
            </View>
          </View>
        )}

        {/* Floor Plan Image */}
        <View style={styles.floorPlanContainer}>
          {currentFloor?.image ? (
            <ScrollView
              horizontal
              contentContainerStyle={styles.floorPlanScrollContent}
              showsHorizontalScrollIndicator={false}
            >
              <ScrollView
                contentContainerStyle={styles.floorPlanScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.floorPlanCanvas}>
                  <Image
                    source={currentFloor.image}
                    style={styles.floorPlanImage}
                    resizeMode="contain"
                  />
                  {selectedRoomHighlight ? (
                    <View
                      key={selectedRoom?.id ?? selectedRoom?.label}
                      testID="selected-room-highlight"
                      style={[
                        styles.roomHighlight,
                        {
                          left: `${(selectedRoomHighlight.x / 1000) * 100}%`,
                          top: `${(selectedRoomHighlight.y / 1000) * 100}%`,
                        },
                      ]}
                    />
                  ) : null}
                </View>
              </ScrollView>
            </ScrollView>
          ) : (
            <View style={styles.noFloorPlan}>
              <MaterialIcons name="map" size={48} color="#ccc" />
              <Text style={styles.noFloorPlanText}>
                Floor plan not available
              </Text>
            </View>
          )}
        </View>

        {/* POI Legend */}
        <ScrollView
          horizontal
          style={styles.poiLegendScroll}
          contentContainerStyle={styles.poiLegend}
          showsHorizontalScrollIndicator={false}
        >
          {Object.entries(POI_ICONS).map(([key, { icon, label }]) => (
            <View key={key} style={styles.poiLegendItem}>
              <MaterialIcons name={icon} size={18} color={MAROON} />
              <Text style={styles.poiLabel}>{label}</Text>
            </View>
          ))}
        </ScrollView>

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
          <View style={styles.floorSelectorContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.floorSelectorContent}
            >
              {currentBuilding.floors.map((floor, idx) => (
                <Pressable
                  key={floor.id}
                  style={[
                    styles.floorButton,
                    selectedFloorIdx === idx && styles.floorButtonActive,
                  ]}
                  onPress={() => handleFloorSelect(idx)}
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
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
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

  // Floor Plan
  floorPlanContainer: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f9f5ef",
    borderWidth: 1,
    borderColor: "#e0d8ce",
  },
  floorPlanScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  floorPlanImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
  },
  floorPlanCanvas: {
    position: "relative",
  },
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
  poiLegendScroll: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  poiLegend: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 16,
    alignItems: "center",
  },
  poiLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  poiLabel: {
    fontSize: 12,
    color: "#666",
  },

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
