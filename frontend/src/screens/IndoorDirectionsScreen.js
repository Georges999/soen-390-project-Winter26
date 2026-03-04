import React, { useState, useMemo, useCallback } from "react";
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
import Svg, { Path, Circle, Line } from "react-native-svg";
import { buildings, getFloorGraphData, getRoomsForFloor, getAllNodesForFloor } from "../data/indoorFloorData";
import { findShortestPath } from "../utils/pathfinding/pathfinding";

const MAROON = "#912338";
const BLUE = "#4A90D9";
const GREEN = "#28a745";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Map image dimensions
const MAP_IMAGE_WIDTH = SCREEN_WIDTH - 32;
const MAP_IMAGE_HEIGHT = SCREEN_WIDTH - 60;

export default function IndoorDirectionsScreen({ route, navigation }) {
  const params = route?.params || {};

  // Start and destination rooms
  const [startRoom, setStartRoom] = useState(params.startRoom || null);
  const [destRoom, setDestRoom] = useState(params.destinationRoom || null);
  
  // Input text for search
  const [startText, setStartText] = useState(params.startRoom?.label || "");
  const [destText, setDestText] = useState(params.destinationRoom?.label || "");
  const [activeField, setActiveField] = useState(null); // "start" or "dest"
  const [searchQuery, setSearchQuery] = useState("");

  // Selected campus for room lookup
  const [selectedCampus] = useState("sgw");

  // Selection mode for map clicks
  const [selectionMode, setSelectionMode] = useState(null); // "start" or "dest"

  // Accessibility route toggle
  const [accessibleRoute, setAccessibleRoute] = useState(false);

  // Current floor being displayed
  const selectedBuilding = params.building || buildings.sgw[1]; // Default to MB building
  const [selectedFloor, setSelectedFloor] = useState(params.floor || selectedBuilding?.floors?.[0]);

  // Get current floor dimensions from the floor data
  const floorDimensions = useMemo(() => {
    return {
      width: selectedFloor?.width || 1000,
      height: selectedFloor?.height || 1000
    };
  }, [selectedFloor]);

  // All rooms for search (with coordinates from JSON data)
  const allRooms = useMemo(() => {
    const rooms = [];
    // SGW campus
    const sgwBuildings = buildings.sgw || [];
    sgwBuildings.forEach((building) => {
      building.rooms.forEach((room) => {
        rooms.push({ 
          ...room, 
          buildingName: building.name, 
          buildingId: building.id 
        });
      });
    });
    // Loyola campus
    const loyolaBuildings = buildings.loyola || [];
    loyolaBuildings.forEach((building) => {
      building.rooms.forEach((room) => {
        rooms.push({ 
          ...room, 
          buildingName: building.name, 
          buildingId: building.id 
        });
      });
    });
    return rooms;
  }, []);

  // Current floor rooms and nodes for map interaction
  const currentFloorData = useMemo(() => {
    if (!selectedFloor) return { rooms: [], nodes: [], pois: [] };
    
    const floorId = selectedFloor.id;
    const rooms = getRoomsForFloor(floorId);
    const allNodes = getAllNodesForFloor(floorId);
    
    return {
      rooms,
      nodes: allNodes.filter(n => n.type === 'hallway'),
      pois: allNodes.filter(n => n.type !== 'hallway' && n.type !== 'classroom' && n.type !== 'room')
    };
  }, [selectedFloor]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allRooms.filter(
      (r) =>
        r.label?.toLowerCase().includes(q) ||
        r.id?.toLowerCase().includes(q) ||
        r.buildingName?.toLowerCase().includes(q)
    );
  }, [searchQuery, allRooms]);

  // Calculate path using pathfinding algorithm
  const pathResult = useMemo(() => {
    if (!startRoom || !destRoom) return null;
    
    // Build floors data structure for pathfinding
    const floorsData = {
      floors: {}
    };
    
    // Get floor data from the selected building
    if (selectedBuilding?.floors) {
      selectedBuilding.floors.forEach((floor) => {
        const floorGraphData = getFloorGraphData(selectedBuilding.id, floor.id);
        floorsData.floors[floor.id] = {
          label: floor.label,
          nodes: floorGraphData.nodes,
          rooms: floorGraphData.rooms,
          pois: floorGraphData.pois,
          edges: floorGraphData.edges
        };
      });
    }

    console.log('Pathfinding input:', {
      startNodeId: startRoom.id,
      endNodeId: destRoom.id,
      floorsData
    });

    const result = findShortestPath({
      floorsData,
      startNodeId: startRoom.id,
      endNodeId: destRoom.id
    });

    console.log('Pathfinding result:', result);
    return result;
  }, [startRoom, destRoom, selectedBuilding]);

  // Generate step-by-step directions from path
  const directionSteps = useMemo(() => {
    if (!pathResult?.ok || !pathResult.pathCoords) {
      return [];
    }

    const steps = [];
    const coords = pathResult.pathCoords;

    if (coords.length >= 2) {
      steps.push({
        step: 1,
        text: `Start at ${startRoom?.label || 'starting point'}`,
        distance: null
      });

      // Add intermediate steps based on path nodes
      for (let i = 1; i < coords.length - 1; i++) {
        const node = coords[i];
        let stepText = "Continue along the corridor";
        
        if (node.type === 'elevator') {
          stepText = "Pass the elevator";
        } else if (node.type === 'stairs') {
          stepText = "Pass the stairs";
        } else if (node.type === 'washroom') {
          stepText = "Pass the washroom on your right";
        } else if (node.type === 'hallway') {
          stepText = "Continue through the hallway";
        } else if (node.type === 'escalator') {
          stepText = "Pass the escalator";
        }

        steps.push({
          step: i + 1,
          text: stepText,
          distance: null
        });
      }

      steps.push({
        step: coords.length,
        text: `Arrive at ${destRoom?.label || 'destination'}`,
        distance: null
      });
    }

    return steps;
  }, [pathResult, startRoom, destRoom]);

  // Route stats - calculate actual distance
  const routeStats = useMemo(() => {
    if (!pathResult?.ok) {
      return { duration: "--", distance: "--", type: "walking" };
    }
    
    // The totalWeight is the sum of edge weights (roughly in pixels/units)
    // Convert to approximate meters (assuming ~1 pixel = 0.1m for indoor maps)
    const distanceMeters = Math.round(pathResult.totalWeight * 0.1);
    
    // Estimate walking time (average walking speed ~1.2 m/s indoors)
    const durationSeconds = distanceMeters / 1.2;
    const durationMinutes = Math.max(1, Math.ceil(durationSeconds / 60));
    
    return {
      duration: `${durationMinutes} min`,
      distance: `${distanceMeters}m`,
      type: "walking"
    };
  }, [pathResult]);

  // Generate SVG path from coordinates
  const svgPath = useMemo(() => {
    if (!pathResult?.ok || !pathResult.pathCoords || pathResult.pathCoords.length < 2) {
      return null;
    }

    const coords = pathResult.pathCoords;
    // Scale coordinates to match image dimensions
    const scaleX = MAP_IMAGE_WIDTH / floorDimensions.width;
    const scaleY = MAP_IMAGE_HEIGHT / floorDimensions.height;

    let pathD = `M ${coords[0].x * scaleX} ${coords[0].y * scaleY}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i].x * scaleX} ${coords[i].y * scaleY}`;
    }

    return {
      path: pathD,
      start: { x: coords[0].x * scaleX, y: coords[0].y * scaleY },
      end: { x: coords[coords.length - 1].x * scaleX, y: coords[coords.length - 1].y * scaleY },
      points: coords.map(c => ({ x: c.x * scaleX, y: c.y * scaleY, type: c.type }))
    };
  }, [pathResult, floorDimensions]);

  const handleFieldChange = (text) => {
    setSearchQuery(text);
    if (activeField === "start") {
      setStartText(text);
    } else {
      setDestText(text);
    }
  };

  const handleSelectRoom = (room) => {
    const floorLabel = room.floor?.split("-")[1] || room.floor;
    if (activeField === "start") {
      setStartRoom(room);
      setStartText(room.label + ", Floor " + floorLabel);
    } else {
      setDestRoom(room);
      setDestText(room.label + ", Floor " + floorLabel);
    }
    setSearchQuery("");
    setActiveField(null);
    setSelectionMode(null);
  };

  const handleSwap = () => {
    const tempRoom = startRoom;
    const tempText = startText;
    setStartRoom(destRoom);
    setStartText(destText);
    setDestRoom(tempRoom);
    setDestText(tempText);
  };

  // Handle map tap to select start/end point
  const handleMapPress = useCallback((event) => {
    if (!selectionMode) return;

    const { locationX, locationY } = event.nativeEvent;
    
    // Scale tap coordinates back to original floor plan coordinates
    const scaleX = floorDimensions.width / MAP_IMAGE_WIDTH;
    const scaleY = floorDimensions.height / MAP_IMAGE_HEIGHT;
    const tapX = locationX * scaleX;
    const tapY = locationY * scaleY;

    console.log('Map tap:', { locationX, locationY, tapX, tapY });

    // Find nearest room from the current floor's rooms
    let nearestRoom = null;
    let nearestDistance = Infinity;

    currentFloorData.rooms.forEach((room) => {
      if (room.x !== undefined && room.y !== undefined) {
        const distance = Math.sqrt(Math.pow(room.x - tapX, 2) + Math.pow(room.y - tapY, 2));
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestRoom = room;
        }
      }
    });

    console.log('Nearest room:', nearestRoom, 'Distance:', nearestDistance);

    // Use a larger threshold for selection (150 units)
    if (nearestRoom && nearestDistance < 150) {
      const floorLabel = selectedFloor?.label || nearestRoom.floor?.split("-")[1];
      if (selectionMode === "start") {
        setStartRoom({ ...nearestRoom, buildingName: selectedBuilding.name, buildingId: selectedBuilding.id });
        setStartText(nearestRoom.label + ", Floor " + floorLabel);
      } else {
        setDestRoom({ ...nearestRoom, buildingName: selectedBuilding.name, buildingId: selectedBuilding.id });
        setDestText(nearestRoom.label + ", Floor " + floorLabel);
      }
      setSelectionMode(null);
    } else {
      console.log('No room found within threshold');
    }
  }, [selectionMode, selectedBuilding, selectedFloor, currentFloorData, floorDimensions]);

  // Toggle selection mode
  const toggleSelectionMode = (mode) => {
    setSelectionMode(selectionMode === mode ? null : mode);
  };

  // Scale room coordinates for display
  const scaleCoord = useCallback((x, y) => {
    const scaleX = MAP_IMAGE_WIDTH / floorDimensions.width;
    const scaleY = MAP_IMAGE_HEIGHT / floorDimensions.height;
    return { x: x * scaleX, y: y * scaleY };
  }, [floorDimensions]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="chevron-left" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Indoor Directions</Text>
        </View>

        {/* Search Inputs with Map Selection Buttons */}
        <View style={styles.searchSection}>
          {/* Start Input */}
          <View style={styles.inputRowContainer}>
            <View style={[styles.inputRow, selectionMode === "start" && styles.inputRowActive]}>
              <MaterialIcons name="trip-origin" size={18} color={GREEN} />
              <TextInput
                style={styles.input}
                placeholder="Tap map or search start"
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
                <Pressable onPress={() => { setStartRoom(null); setStartText(""); setSearchQuery(""); }} hitSlop={10}>
                  <MaterialIcons name="close" size={16} color="#999" />
                </Pressable>
              )}
            </View>
            <Pressable 
              style={[styles.mapSelectButton, selectionMode === "start" && styles.mapSelectButtonActive]}
              onPress={() => toggleSelectionMode("start")}
            >
              <MaterialIcons name="my-location" size={20} color={selectionMode === "start" ? "#fff" : MAROON} />
            </Pressable>
          </View>

          {/* Destination Input */}
          <View style={styles.inputRowContainer}>
            <View style={[styles.inputRow, selectionMode === "dest" && styles.inputRowActive]}>
              <MaterialIcons name="place" size={18} color={MAROON} />
              <TextInput
                style={styles.input}
                placeholder="Tap map or search destination"
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
                <Pressable onPress={() => { setDestRoom(null); setDestText(""); setSearchQuery(""); }} hitSlop={10}>
                  <MaterialIcons name="close" size={16} color="#999" />
                </Pressable>
              )}
            </View>
            <Pressable 
              style={[styles.mapSelectButton, selectionMode === "dest" && styles.mapSelectButtonActive]}
              onPress={() => toggleSelectionMode("dest")}
            >
              <MaterialIcons name="place" size={20} color={selectionMode === "dest" ? "#fff" : MAROON} />
            </Pressable>
          </View>

          {/* Swap Button */}
          <Pressable style={styles.swapButton} onPress={handleSwap}>
            <MaterialIcons name="swap-vert" size={20} color={MAROON} />
          </Pressable>
        </View>

        {/* Selection Mode Indicator */}
        {selectionMode && (
          <View style={styles.selectionModeIndicator}>
            <MaterialIcons name="touch-app" size={18} color={MAROON} />
            <Text style={styles.selectionModeText}>
              Tap on the map to select {selectionMode === "start" ? "start point" : "destination"}
            </Text>
          </View>
        )}

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
                    {item.label}, Floor {item.floor?.split("-")[1] || item.floor} · {item.buildingName}
                  </Text>
                </Pressable>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        )}

        {/* Walking Mode Indicator (Walking Only) */}
        <View style={styles.transportContainer}>
          <View style={[styles.transportChip, styles.transportChipActive]}>
            <MaterialIcons name="directions-walk" size={18} color="#fff" />
            <Text style={[styles.transportChipText, styles.transportChipTextActive]}>Walking</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Floor Plan with Route */}
          <Pressable 
            style={styles.floorPlanContainer}
            onPress={handleMapPress}
          >
            {selectedFloor?.image ? (
              <View style={styles.mapWrapper}>
                <Image
                  source={selectedFloor.image}
                  style={styles.floorPlanImage}
                  resizeMode="contain"
                />
                {/* SVG Overlay for Route and Markers */}
                <Svg style={styles.svgOverlay} width={MAP_IMAGE_WIDTH} height={MAP_IMAGE_HEIGHT}>
                  {/* Show clickable room markers when in selection mode */}
                  {selectionMode && currentFloorData.rooms.map((room) => {
                    if (room.x === undefined || room.y === undefined) return null;
                    const scaled = scaleCoord(room.x, room.y);
                    return (
                      <Circle
                        key={room.id}
                        cx={scaled.x}
                        cy={scaled.y}
                        r={8}
                        fill="rgba(145, 35, 56, 0.3)"
                        stroke={MAROON}
                        strokeWidth={2}
                      />
                    );
                  })}
                  
                  {/* Route Path */}
                  {svgPath && (
                    <>
                      <Path
                        d={svgPath.path}
                        stroke={BLUE}
                        strokeWidth={4}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="8,4"
                      />
                      {/* Start Point */}
                      <Circle
                        cx={svgPath.start.x}
                        cy={svgPath.start.y}
                        r={12}
                        fill={GREEN}
                        stroke="#fff"
                        strokeWidth={3}
                      />
                      {/* End Point */}
                      <Circle
                        cx={svgPath.end.x}
                        cy={svgPath.end.y}
                        r={12}
                        fill={MAROON}
                        stroke="#fff"
                        strokeWidth={3}
                      />
                    </>
                  )}
                  
                  {/* Start/End Markers when selected but no path yet */}
                  {!svgPath && startRoom?.x && startRoom?.y && (
                    <Circle
                      cx={scaleCoord(startRoom.x, startRoom.y).x}
                      cy={scaleCoord(startRoom.x, startRoom.y).y}
                      r={12}
                      fill={GREEN}
                      stroke="#fff"
                      strokeWidth={3}
                    />
                  )}
                  {!svgPath && destRoom?.x && destRoom?.y && (
                    <Circle
                      cx={scaleCoord(destRoom.x, destRoom.y).x}
                      cy={scaleCoord(destRoom.x, destRoom.y).y}
                      r={12}
                      fill={MAROON}
                      stroke="#fff"
                      strokeWidth={3}
                    />
                  )}
                </Svg>
              </View>
            ) : (
              <View style={styles.noFloorPlan}>
                <MaterialIcons name="map" size={48} color="#ccc" />
                <Text style={styles.noFloorPlanText}>Select start and destination</Text>
              </View>
            )}
          </Pressable>

          {/* Route Stats Bar */}
          {startRoom && destRoom ? (
            <>
              <View style={styles.statsBar}>
                <View style={styles.statItem}>
                  <MaterialIcons name="directions-walk" size={20} color={MAROON} />
                  <Text style={styles.statValue}>{routeStats.duration}</Text>
                  <Text style={styles.statLabel}>walking</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{routeStats.distance}</Text>
                  <Text style={styles.statLabel}>distance</Text>
                </View>
                <View style={styles.statItemRight}>
                  <Text style={styles.statValue}>{routeStats.type}</Text>
                  <Text style={styles.statLabel}>route</Text>
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

              {/* Path Error Message */}
              {pathResult && !pathResult.ok && (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color="#dc3545" />
                  <Text style={styles.errorText}>{pathResult.reason}</Text>
                </View>
              )}

              {/* Step-by-Step Directions */}
              {directionSteps.length > 0 && (
                <View style={styles.stepsContainer}>
                  <Text style={styles.stepsTitle}>STEP-BY-STEP DIRECTIONS</Text>
                  {directionSteps.map((step) => (
                    <View key={step.step} style={styles.stepRow}>
                      <View style={styles.stepNumberCircle}>
                        <Text style={styles.stepNumber}>{step.step}</Text>
                      </View>
                      <View style={styles.stepTextContainer}>
                        <Text style={styles.stepText}>{step.text}</Text>
                        {step.distance != null && (
                          <Text style={styles.stepDistance}>{step.distance}</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyPrompt}>
              <MaterialIcons name="directions" size={32} color="#ccc" />
              <Text style={styles.emptyPromptText}>
                Select start and destination points to see walking directions
              </Text>
              <Text style={styles.emptyPromptSubtext}>
                Use the search bars or tap on the map
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ...existing code...
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
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "relative",
  },
  inputRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  inputRowActive: {
    borderColor: MAROON,
    backgroundColor: "#fff5f5",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    marginLeft: 8,
  },
  mapSelectButton: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  mapSelectButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  swapButton: {
    position: "absolute",
    right: 70,
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
  selectionModeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#fff5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#f0d0d7",
  },
  selectionModeText: {
    marginLeft: 8,
    fontSize: 14,
    color: MAROON,
    fontWeight: "600",
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
  transportContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 8,
  },
  transportChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
    gap: 6,
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
  scrollContent: {
    flex: 1,
  },
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
  mapWrapper: {
    position: "relative",
  },
  floorPlanImage: {
    width: MAP_IMAGE_WIDTH,
    height: MAP_IMAGE_HEIGHT,
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
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
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff5f5",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffcccc",
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#dc3545",
  },
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
  emptyPromptSubtext: {
    marginTop: 4,
    fontSize: 12,
    color: "#bbb",
    textAlign: "center",
  },
});
