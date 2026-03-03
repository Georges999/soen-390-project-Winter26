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
import { buildings } from "../data/indoorFloorData";

const MAROON = "#912338";
const BLUE = "#4A90D9";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Placeholder step-by-step directions for the UI demo
const PLACEHOLDER_STEPS = [
  { step: 1, text: "Exit the room into the main corridor", distance: null },
  { step: 2, text: "Continue straight for ~30m\nPass washrooms on your right", distance: "30m" },
  { step: 3, text: "Destination is on your left", distance: null },
];

// Cross-floor steps placeholder (reserved for future pathfinding integration)
// const PLACEHOLDER_CROSS_FLOOR_STEPS = [
//   { step: 1, text: "Exit the room into the main corridor", distance: null },
//   { step: 2, text: "Turn left until you reach the corridor", distance: null },
//   { step: 3, text: "Take the elevator to the destination floor", distance: null },
//   { step: 4, text: "Turn left until the corridor", distance: null },
//   { step: 5, text: "Walk straight for 20m", distance: "20m" },
// ];

export default function IndoorDirectionsScreen({ route, navigation }) {
  const params = route?.params || {};

  // Start and destination input texts
  const [startText, setStartText] = useState(params.startRoom?.label || "");
  const [destText, setDestText] = useState(params.destinationRoom?.label || "");
  const [activeField, setActiveField] = useState(null); // "start" or "dest"
  const [searchQuery, setSearchQuery] = useState("");

  // Selected campus for room lookup
  const [selectedCampus] = useState("sgw");

  // Transport mode
  const [transportMode, setTransportMode] = useState("Walk");

  // Accessibility route toggle
  const [accessibleRoute, setAccessibleRoute] = useState(false);

  // Current floor being displayed
  const selectedBuilding = params.building || buildings.sgw[0];
  const selectedFloor = params.floor || selectedBuilding?.floors?.[0];

  // All rooms for search
  const allRooms = useMemo(() => {
    const rooms = [];
    const campusBuildings = buildings[selectedCampus] || [];
    campusBuildings.forEach((building) => {
      building.rooms.forEach((room) => {
        rooms.push({ ...room, buildingName: building.name, buildingId: building.id });
      });
    });
    // Also add loyola rooms
    const loyolaBuildings = buildings.loyola || [];
    loyolaBuildings.forEach((building) => {
      building.rooms.forEach((room) => {
        rooms.push({ ...room, buildingName: building.name, buildingId: building.id });
      });
    });
    return rooms;
  }, [selectedCampus]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allRooms.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.buildingName.toLowerCase().includes(q)
    );
  }, [searchQuery, allRooms]);

  // Placeholder route stats
  const routeStats = {
    duration: "1 min",
    distance: "45m",
    type: "shortest path",
  };

  const handleFieldChange = (text) => {
    setSearchQuery(text);
    if (activeField === "start") {
      setStartText(text);
    } else {
      setDestText(text);
    }
  };

  const handleSelectRoom = (room) => {
    if (activeField === "start") {
      setStartText(room.label + ", Floor " + room.floor.split("-")[1]);
    } else {
      setDestText(room.label + ", Floor " + room.floor.split("-")[1]);
    }
    setSearchQuery("");
    setActiveField(null);
  };

  const handleSwap = () => {
    const temp = startText;
    setStartText(destText);
    setDestText(temp);
  };

  const transportModes = ["Walk", "Car", "Bike"];

  // Use cross-floor steps if rooms are on different floors
  const directionSteps = PLACEHOLDER_STEPS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={28} color={MAROON} />
          </Pressable>
          <Text style={styles.headerTitle}>Indoor Directions</Text>
        </View>

        {/* Search Inputs */}
        <View style={styles.searchSection}>
          {/* Start Input */}
          <View style={styles.inputRow}>
            <MaterialIcons name="search" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Start room"
              placeholderTextColor="#999"
              value={activeField === "start" ? searchQuery : startText}
              onChangeText={handleFieldChange}
              onFocus={() => {
                setActiveField("start");
                setSearchQuery(startText);
              }}
              onBlur={() => {
                if (!searchResults.length) setActiveField(null);
              }}
            />
            {startText.length > 0 && (
              <Pressable onPress={() => { setStartText(""); setSearchQuery(""); }} hitSlop={10}>
                <MaterialIcons name="close" size={16} color="#999" />
              </Pressable>
            )}
          </View>

          {/* Destination Input */}
          <View style={styles.inputRow}>
            <MaterialIcons name="search" size={18} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="Destination room"
              placeholderTextColor="#999"
              value={activeField === "dest" ? searchQuery : destText}
              onChangeText={handleFieldChange}
              onFocus={() => {
                setActiveField("dest");
                setSearchQuery(destText);
              }}
              onBlur={() => {
                if (!searchResults.length) setActiveField(null);
              }}
            />
            {destText.length > 0 && (
              <Pressable onPress={() => { setDestText(""); setSearchQuery(""); }} hitSlop={10}>
                <MaterialIcons name="close" size={16} color="#999" />
              </Pressable>
            )}
          </View>

          {/* Swap Button */}
          <Pressable style={styles.swapButton} onPress={handleSwap}>
            <MaterialIcons name="swap-vert" size={20} color={MAROON} />
          </Pressable>
        </View>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && activeField && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults.slice(0, 6)}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.searchResultItem}
                  onPress={() => handleSelectRoom(item)}
                >
                  <Text style={styles.searchResultText}>
                    {item.label}, Floor {item.floor.split("-")[1]} · {item.buildingName}
                  </Text>
                </Pressable>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Transport Mode Chips */}
        <View style={styles.transportContainer}>
          {transportModes.map((mode) => (
            <Pressable
              key={mode}
              style={[
                styles.transportChip,
                transportMode === mode && styles.transportChipActive,
              ]}
              onPress={() => setTransportMode(mode)}
            >
              <Text
                style={[
                  styles.transportChipText,
                  transportMode === mode && styles.transportChipTextActive,
                ]}
              >
                {mode}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Floor Plan with Route */}
          <View style={styles.floorPlanContainer}>
            {selectedFloor?.image ? (
              <Image
                source={selectedFloor.image}
                style={styles.floorPlanImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.noFloorPlan}>
                <MaterialIcons name="map" size={48} color="#ccc" />
                <Text style={styles.noFloorPlanText}>Select start and destination rooms</Text>
              </View>
            )}
          </View>

          {/* Route Stats Bar */}
          {startText && destText ? (
            <>
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeStats.duration}</Text>
                  <Text style={styles.statLabel}>duration</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeStats.distance}</Text>
                  <Text style={styles.statLabel}>distance</Text>
                </View>
                <View style={styles.statItemRight}>
                  <Text style={styles.statValue}>{routeStats.type}</Text>
                  <Text style={styles.statLabel}>path</Text>
                </View>
                {/* Accessibility Button */}
                <Pressable
                  style={[
                    styles.accessButton,
                    accessibleRoute && styles.accessButtonActive,
                  ]}
                  onPress={() => setAccessibleRoute(!accessibleRoute)}
                >
                  <Text style={styles.accessButtonIcon}>♿</Text>
                </Pressable>
              </View>

              {/* Step-by-Step Directions */}
              <View style={styles.stepsContainer}>
                <Text style={styles.stepsTitle}>STEP-BY-STEP</Text>
                {directionSteps.map((step) => (
                  <View key={step.step} style={styles.stepRow}>
                    <View style={styles.stepNumberCircle}>
                      <Text style={styles.stepNumber}>{step.step}</Text>
                    </View>
                    <View style={styles.stepTextContainer}>
                      <Text style={styles.stepText}>{step.text}</Text>
                      {step.distance && (
                        <Text style={styles.stepDistance}>{step.distance}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyPrompt}>
              <MaterialIcons name="directions" size={32} color="#ccc" />
              <Text style={styles.emptyPromptText}>
                Enter start and destination rooms to see directions
              </Text>
            </View>
          )}
        </ScrollView>
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

  // Search Section
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "relative",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    marginLeft: 8,
  },
  swapButton: {
    position: "absolute",
    right: 4,
    top: "50%",
    backgroundColor: "#fff",
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchResultsContainer: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    maxHeight: 180,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 100,
  },
  searchResultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchResultText: {
    fontSize: 14,
    color: "#333",
  },

  // Transport Mode
  transportContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 10,
  },
  transportChip: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  transportChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  transportChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },
  transportChipTextActive: {
    color: "#fff",
  },

  // Scroll Content
  scrollContent: {
    flex: 1,
  },

  // Floor Plan
  floorPlanContainer: {
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
  floorPlanImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 60,
  },
  noFloorPlan: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noFloorPlanText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
  },

  // Route Stats
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statItemRight: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: MAROON,
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    marginTop: 2,
  },
  accessButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  accessButtonActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  accessButtonIcon: {
    fontSize: 18,
  },

  // Step-by-Step
  stepsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MAROON,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepTextContainer: {
    flex: 1,
  },
  stepText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  stepDistance: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  // Empty Prompt
  emptyPrompt: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyPromptText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 40,
  },
});
