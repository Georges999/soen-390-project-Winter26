import React, { useState, useMemo, useCallback } from "react";
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
  SafeAreaView,
  Switch,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";
import { buildings, getFloorGraphData, getRoomsForFloor, getAllNodesForFloor, getBuildingById, FLOOR_META } from "../data/indoorFloorData";
import { findShortestPath } from "../utils/pathfinding/pathfinding";
import { classifyRoute, buildRouteSegments } from "../utils/pathfinding/crossFloorRouter";

const MAROON = "#912338";
const BLUE = "#4A90D9";
const GREEN = "#28a745";
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function buildAllRooms() {
  return Object.entries(buildings).flatMap(([campusId, campusBuildings]) =>
    (campusBuildings || []).flatMap((building) =>
      (building.rooms || []).map((room) => ({
        ...room,
        campusId,
        buildingName: building.name,
        buildingId: building.id,
      }))
    )
  );
}

export function getSelectionForLocation(buildingId, floorId, fallbackCampus = "sgw") {
  const matchedCampus =
    Object.entries(buildings).find(([, campusBuildings]) =>
      (campusBuildings || []).some((building) => building.id === buildingId)
    )?.[0] || fallbackCampus;

  const campusBuildings = buildings[matchedCampus] || [];
  const buildingIdx = campusBuildings.findIndex((building) => building.id === buildingId);
  const resolvedBuildingIdx = Math.max(buildingIdx, 0);
  const resolvedBuilding = campusBuildings[resolvedBuildingIdx] || campusBuildings[0];
  const floorIdx = resolvedBuilding?.floors?.findIndex((floor) => floor.id === floorId) ?? 0;

  return {
    campusId: matchedCampus,
    buildingIdx: resolvedBuildingIdx,
    floorIdx: Math.max(floorIdx, 0),
  };
}

export function getInitialSelection(params) {
  const preferredRoom = params.destinationRoom || params.startRoom;
  const buildingId = preferredRoom?.buildingId || params.building?.id || buildings.sgw?.[0]?.id;
  const floorId = preferredRoom?.floor || params.floor?.id || buildings.sgw?.[0]?.floors?.[0]?.id;

  return getSelectionForLocation(buildingId, floorId);
}

// ── Step-text helpers (extracted to reduce cognitive complexity) ──

const NODE_TYPE_TEXT = {
  elevator: "Pass the elevator",
  stairs: "Pass the stairs",
  washroom: "Pass the washroom on your right",
  escalator: "Pass the escalator",
  hallway: "Continue through the hallway",
};

function nodeStepText(node) {
  return NODE_TYPE_TEXT[node.type] || "Continue along the corridor";
}

function buildSegmentIcon(method) {
  return method === "elevator" ? "elevator" : "stairs";
}

/** Build direction steps for cross-floor / cross-building routes. */
function buildMultiSegmentSteps(segmentResults, startRoom, destRoom) {
  const steps = [];
  let stepNum = 1;

  steps.push({ step: stepNum++, text: `Start at ${startRoom?.label || "starting point"}`, icon: "trip-origin" });

  for (let si = 0; si < segmentResults.length; si++) {
    const { segment, pathResult: segPath } = segmentResults[si];

    if (segment.type === "indoor" && segPath?.ok) {
      const coords = segPath.pathCoords || [];
      const floorMeta = FLOOR_META[segment.floorId];
      const floorLabel = floorMeta?.floorLabel || segment.floorId;

      if (si > 0) {
        steps.push({ step: stepNum++, text: `Continue on Floor ${floorLabel}`, icon: "layers" });
      }

      for (let i = 1; i < coords.length - 1; i++) {
        steps.push({ step: stepNum++, text: nodeStepText(coords[i]) });
      }
    } else if (segment.type === "vertical") {
      const fromLabel = FLOOR_META[segment.fromFloor]?.floorLabel || segment.fromFloor;
      const toLabel = FLOOR_META[segment.toFloor]?.floorLabel || segment.toFloor;
      const method = segment.transitionType === "elevator" ? "elevator" : "stairs";
      steps.push({
        step: stepNum++,
        text: `Take the ${method} from Floor ${fromLabel} to Floor ${toLabel}`,
        icon: buildSegmentIcon(method),
      });
    } else if (segment.type === "outdoor") {
      steps.push({
        step: stepNum++,
        text: `Walk outside to the ${segment.toBuildingId?.toUpperCase() || "destination"} building`,
        icon: "directions-walk",
      });
    }
  }

  steps.push({ step: stepNum, text: `Arrive at ${destRoom?.label || "destination"}`, icon: "place" });
  return steps;
}

/** Build direction steps for same-floor routes. */
function buildSameFloorSteps(coords, startRoom, destRoom) {
  if (coords.length < 2) return [];

  const steps = [{
    step: 1,
    text: `Start at ${startRoom?.label || 'starting point'}`,
    distance: null,
  }];

  for (let i = 1; i < coords.length - 1; i++) {
    steps.push({
      step: i + 1,
      text: nodeStepText(coords[i]),
      distance: null,
    });
  }

  steps.push({
    step: coords.length,
    text: `Arrive at ${destRoom?.label || 'destination'}`,
    distance: null,
  });

  return steps;
}

// Map image dimensions
const MAP_IMAGE_WIDTH = SCREEN_WIDTH - 32;
const MAP_IMAGE_HEIGHT = SCREEN_WIDTH - 60;

/** Resolve a single route segment into { segment, pathResult }. */
function resolveSegmentPath(seg, accessible) {
  if (seg.type !== "indoor") return { segment: seg, pathResult: null };

  const buildingObj = getBuildingById(seg.buildingId);
  if (!buildingObj) return { segment: seg, pathResult: { ok: false, reason: "Building not found" } };

  const floorsData = { floors: {} };
  buildingObj.floors.forEach((floor) => {
    const fd = getFloorGraphData(buildingObj.id, floor.id);
    floorsData.floors[floor.id] = { label: floor.label, nodes: fd.nodes, rooms: fd.rooms, pois: fd.pois, edges: fd.edges };
  });

  const result = findShortestPath({
    floorsData,
    startNodeId: seg.fromNodeId,
    endNodeId: seg.toNodeId,
    accessible,
  });
  return { segment: seg, pathResult: result };
}

export default function IndoorDirectionsScreen({ route, navigation }) {
  const params = route?.params || {};
  const initialSelection = getInitialSelection(params);

  // Start and destination rooms
  const [startRoom, setStartRoom] = useState(params.startRoom || null);
  const [destRoom, setDestRoom] = useState(params.destinationRoom || null);
  
  // Input text for search
  const [startText, setStartText] = useState(params.startRoom?.label || "");
  const [destText, setDestText] = useState(params.destinationRoom?.label || "");
  const [activeField, setActiveField] = useState(null); // "start" or "dest"
  const [searchQuery, setSearchQuery] = useState("");

  // Selection mode for map clicks
  const [selectionMode, setSelectionMode] = useState(null); // "start" or "dest"

  // Accessibility route toggle
  const [accessibleRoute, setAccessibleRoute] = useState(false);

  // Transition preference for cross-floor routes
  const [transitionPref, setTransitionPref] = useState(null); // "stairs" | "elevator"
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const [selectedCampus, setSelectedCampus] = useState(initialSelection.campusId);
  const [selectedBuildingIdx, setSelectedBuildingIdx] = useState(initialSelection.buildingIdx);
  const [selectedFloorIdx, setSelectedFloorIdx] = useState(initialSelection.floorIdx);

  const campusBuildings = useMemo(
    () => buildings[selectedCampus] || [],
    [selectedCampus]
  );

  // Current building and floor being displayed while browsing
  const selectedBuilding = campusBuildings[selectedBuildingIdx] || campusBuildings[0];
  const selectedFloor =
    selectedBuilding?.floors?.[selectedFloorIdx] || selectedBuilding?.floors?.[0] || null;

  // Get current floor dimensions from the floor data
  const floorDimensions = useMemo(() => {
    return {
      width: selectedFloor?.width || 1000,
      height: selectedFloor?.height || 1000
    };
  }, [selectedFloor]);

  // All rooms for search (with coordinates from JSON data)
  const allRooms = useMemo(() => buildAllRooms(), []);

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

  // Route type classification
  const routeType = useMemo(() => {
    if (!startRoom || !destRoom) return null;
    return classifyRoute(startRoom, destRoom);
  }, [startRoom, destRoom]);

  // Route segments for cross-floor / cross-building
  const routeSegments = useMemo(() => {
    if (!routeType) return [];
    if (routeType === "same-floor" || routeType === "same-room") return [];
    const pref = transitionPref || (accessibleRoute ? "elevator" : "stairs");
    return buildRouteSegments(startRoom, destRoom, pref);
  }, [startRoom, destRoom, routeType, transitionPref, accessibleRoute]);

  // Multi-segment path results (cross-floor)
  const segmentResults = useMemo(() => {
    if (!routeSegments.length) return [];
    return routeSegments.map((seg) => resolveSegmentPath(seg, accessibleRoute));
  }, [routeSegments, accessibleRoute]);

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allRooms.filter(
      (r) =>
        (r.label || "").toLowerCase().includes(q) ||
        (r.id || "").toLowerCase().includes(q) ||
        (r.buildingName || "").toLowerCase().includes(q)
    );
  }, [searchQuery, allRooms]);

  // Calculate path - single floor (same-floor) or first indoor segment (cross-floor)
  const pathResult = useMemo(() => {
    if (!startRoom || !destRoom) return null;

    // Cross-floor / cross-building: use the active segment result
    if (routeSegments.length > 0 && segmentResults.length > 0) {
      // Find the indoor segment at activeSegmentIndex
      const activeResult = segmentResults[activeSegmentIndex];
      if (activeResult?.pathResult) return activeResult.pathResult;
      // If active segment is vertical/outdoor, show the nearest indoor segment
      for (const sr of segmentResults) {
        if (sr.pathResult?.ok) return sr.pathResult;
      }
      return { ok: false, reason: "No indoor path available for this segment" };
    }
    
    // Same-floor: build floors data from the selected building
    const routeBuilding =
      getBuildingById(startRoom.buildingId || destRoom.buildingId || params.building?.id) ||
      selectedBuilding;
    const floorsData = {
      floors: {}
    };
    
    if (routeBuilding?.floors) {
      routeBuilding.floors.forEach((floor) => {
        const floorGraphData = getFloorGraphData(routeBuilding.id, floor.id);
        floorsData.floors[floor.id] = {
          label: floor.label,
          nodes: floorGraphData.nodes,
          rooms: floorGraphData.rooms,
          pois: floorGraphData.pois,
          edges: floorGraphData.edges
        };
      });
    }

    const result = findShortestPath({
      floorsData,
      startNodeId: startRoom.id,
      endNodeId: destRoom.id,
      accessible: accessibleRoute,
    });

    return result;
  }, [startRoom, destRoom, params.building?.id, selectedBuilding, accessibleRoute, routeSegments, segmentResults, activeSegmentIndex]);

  // Generate step-by-step directions from path (supports multi-segment)
  const directionSteps = useMemo(() => {
    // Cross-floor / cross-building: combine all segments into unified steps
    if (segmentResults.length > 0) {
      return buildMultiSegmentSteps(segmentResults, startRoom, destRoom);
    }

    // Same-floor: original logic
    if (!pathResult?.ok || !pathResult.pathCoords) {
      return [];
    }

    return buildSameFloorSteps(pathResult.pathCoords, startRoom, destRoom);
  }, [pathResult, startRoom, destRoom, segmentResults]);

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

  // Determine the floor image to display for active segment
  const displayedFloor = useMemo(() => {
    if (segmentResults.length > 0) {
      const activeSeg = segmentResults[activeSegmentIndex]?.segment;
      if (activeSeg?.type === "indoor" && activeSeg.floorId) {
        const building = getBuildingById(activeSeg.buildingId);
        const floor = building?.floors?.find((f) => f.id === activeSeg.floorId);
        if (floor) return floor;
      }
    }

    if (
      (routeType === "same-floor" || routeType === "same-room") &&
      startRoom?.floor &&
      startRoom.floor === destRoom?.floor
    ) {
      const routeBuilding =
        getBuildingById(startRoom.buildingId || destRoom?.buildingId || params.building?.id) ||
        selectedBuilding;
      const routeFloor = routeBuilding?.floors?.find((floor) => floor.id === startRoom.floor);
      if (routeFloor) return routeFloor;
    }

    return selectedFloor;
  }, [
    segmentResults,
    activeSegmentIndex,
    routeType,
    startRoom,
    destRoom,
    params.building?.id,
    selectedBuilding,
    selectedFloor,
  ]);

  // Generate SVG path from coordinates
  const svgPath = useMemo(() => {
    if (!pathResult?.ok || !pathResult.pathCoords || pathResult.pathCoords.length < 2) {
      return null;
    }

    const coords = pathResult.pathCoords;
    const displayWidth = displayedFloor?.width || floorDimensions.width;
    const displayHeight = displayedFloor?.height || floorDimensions.height;
    const scaleX = MAP_IMAGE_WIDTH / displayWidth;
    const scaleY = MAP_IMAGE_HEIGHT / displayHeight;

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
  }, [pathResult, displayedFloor, floorDimensions]);

  const handleFieldChange = (text) => {
    if (activeField === "start" && startRoom) {
      setStartRoom(null);
      setTransitionPref(null);
      setShowTransitionModal(false);
      setActiveSegmentIndex(0);
    }

    if (activeField === "dest" && destRoom) {
      setDestRoom(null);
      setTransitionPref(null);
      setShowTransitionModal(false);
      setActiveSegmentIndex(0);
    }

    setSearchQuery(text);
    if (activeField === "start") {
      setStartText(text);
    } else {
      setDestText(text);
    }
  };

  const syncSelectionToLocation = useCallback((buildingId, floorId, campusId) => {
    const nextSelection = getSelectionForLocation(buildingId, floorId, campusId);
    setSelectedCampus(nextSelection.campusId);
    setSelectedBuildingIdx(nextSelection.buildingIdx);
    setSelectedFloorIdx(nextSelection.floorIdx);
  }, []);

  const handleCampusChange = (campusId) => {
    setSelectedCampus(campusId);
    setSelectedBuildingIdx(0);
    setSelectedFloorIdx(0);
    setSelectionMode(null);
  };

  const handleBuildingChange = (index) => {
    setSelectedBuildingIdx(index);
    setSelectedFloorIdx(0);
    setSelectionMode(null);
  };

  const handleFloorChange = (index) => {
    setSelectedFloorIdx(index);
    setSelectionMode(null);
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
    syncSelectionToLocation(room.buildingId, room.floor, room.campusId);
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

  const browsingLocked = Boolean(startRoom && destRoom);

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

        <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.explorerPanel}>
          <View style={styles.campusToggleContainer}>
            <Pressable
              style={[
                styles.campusButton,
                selectedCampus === "sgw" && styles.campusButtonActive,
                browsingLocked && styles.selectorDisabled,
              ]}
              disabled={browsingLocked}
              onPress={() => handleCampusChange("sgw")}
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
                browsingLocked && styles.selectorDisabled,
              ]}
              disabled={browsingLocked}
              onPress={() => handleCampusChange("loyola")}
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

          {campusBuildings.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.buildingSelectorContent}
              style={styles.buildingSelectorContainer}
            >
              {campusBuildings.map((building, idx) => (
                <Pressable
                  key={building.id}
                  style={[
                    styles.buildingChip,
                    selectedBuildingIdx === idx && styles.buildingChipActive,
                    browsingLocked && styles.selectorDisabled,
                  ]}
                  disabled={browsingLocked}
                  onPress={() => handleBuildingChange(idx)}
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
        </View>

        <View style={styles.searchColumnWrapper}>
        {/* Search Inputs with Map Selection Buttons */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputsBlock}>
            {/* Start Input */}
            <View style={[styles.inputRowContainer, styles.inputRowContainerStart]}>
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
                    setActiveField(null);
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

            <View style={[styles.inputRowContainer, styles.inputRowContainerDest]}>
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
                    setActiveField(null);
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

            <Pressable
              testID="swap-direction-toggle"
              style={styles.swapButton}
              onPress={handleSwap}
            >
              <MaterialIcons name="swap-vert" size={20} color={MAROON} />
            </Pressable>
          </View>
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
        {searchQuery.trim().length > 0 && activeField && (
          <View style={styles.searchResultsContainer}>
            {searchResults.length > 0 ? (
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.searchResultsScroll}
                showsVerticalScrollIndicator
              >
                {searchResults.slice(0, 6).map((item) => (
                  <Pressable
                    key={item.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSelectRoom(item)}
                  >
                    <Text
                      style={styles.searchResultText}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {item.label}, Floor {item.floor?.split("-")[1] || item.floor} · {item.buildingName}
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
        </View>

        {/* Walking Mode Indicator (Walking Only) */}
        <View style={styles.transportContainer}>
          <View style={[styles.transportChip, styles.transportChipActive]}>
            <MaterialIcons name="directions-walk" size={18} color="#fff" />
            <Text style={[styles.transportChipText, styles.transportChipTextActive]}>Walking</Text>
          </View>
        </View>

        {/* Accessibility Toggle */}
        <View style={styles.accessibilityRow} testID="accessibility-toggle-row">
          <View style={styles.accessibilityLabelContainer}>
            <MaterialIcons name="accessible" size={22} color={accessibleRoute ? BLUE : "#666"} />
            <Text style={[styles.accessibilityLabel, accessibleRoute && styles.accessibilityLabelActive]}>
              Accessible Route
            </Text>
          </View>
          <Text style={styles.accessibilityHint}>
            {accessibleRoute ? "Avoiding stairs" : "Uses stairs if shorter"}
          </Text>
          <Switch
            testID="accessibility-switch"
            value={accessibleRoute}
            onValueChange={(val) => {
              setAccessibleRoute(val);
              if (val) setTransitionPref("elevator");
            }}
            trackColor={{ false: "#ddd", true: BLUE }}
            thumbColor={accessibleRoute ? "#fff" : "#f4f3f4"}
          />
        </View>

        {/* Cross-floor prompt: show transition choice if needed */}
        {(routeType === "cross-floor" || routeType === "cross-building") && !transitionPref && startRoom && destRoom && (
          <Pressable
            style={styles.transitionPrompt}
            onPress={() => setShowTransitionModal(true)}
          >
            <MaterialIcons name="swap-vert" size={22} color={MAROON} />
            <Text style={styles.transitionPromptText}>
              This route requires changing floors. Tap to choose stairs or elevator.
            </Text>
            <MaterialIcons name="chevron-right" size={22} color={MAROON} />
          </Pressable>
        )}

        {/* Segment tabs for cross-floor navigation */}
        {segmentResults.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentTabs}>
            {segmentResults.map((sr, idx) => {
              const seg = sr.segment;
              let label = "";
              let icon = "layers";
              if (seg.type === "indoor") {
                const meta = FLOOR_META[seg.floorId];
                label = meta ? `Floor ${meta.floorLabel}` : seg.floorId;
              } else if (seg.type === "vertical") {
                label = seg.transitionType === "elevator" ? "Elevator" : "Stairs";
                icon = seg.transitionType === "elevator" ? "elevator" : "stairs";
              } else if (seg.type === "outdoor") {
                label = "Outdoor";
                icon = "directions-walk";
              }
              return (
                <Pressable
                  key={`${seg.type}-${seg.floorId || seg.fromFloor || "out"}-${idx}`}
                  style={[styles.segmentTab, idx === activeSegmentIndex && styles.segmentTabActive]}
                  onPress={() => setActiveSegmentIndex(idx)}
                >
                  <MaterialIcons name={icon} size={16} color={idx === activeSegmentIndex ? "#fff" : MAROON} />
                  <Text style={[styles.segmentTabText, idx === activeSegmentIndex && styles.segmentTabTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

          {/* Outdoor segment card */}
          {segmentResults.length > 0 && segmentResults[activeSegmentIndex]?.segment?.type === "outdoor" && (
            <View style={styles.outdoorCard}>
              <MaterialIcons name="directions-walk" size={40} color={MAROON} />
              <Text style={styles.outdoorCardTitle}>Walk between buildings</Text>
              <Text style={styles.outdoorCardSubtext}>
                {segmentResults[activeSegmentIndex].segment.fromBuildingId?.toUpperCase()} → {segmentResults[activeSegmentIndex].segment.toBuildingId?.toUpperCase()}
              </Text>
              <Pressable
                style={styles.outdoorNavButton}
                onPress={() => {
                  const seg = segmentResults[activeSegmentIndex].segment;
                  const { BUILDING_META: bm } = require("../data/indoorFloorData");
                  const startName = bm[seg.fromBuildingId]?.name || seg.fromBuildingId;
                  const destName = bm[seg.toBuildingId]?.name || seg.toBuildingId;
                  navigation.navigate("Map", {
                    outdoorRoute: {
                      startName,
                      destName,
                      startCoords: seg.fromCoords,
                      destCoords: seg.toCoords,
                    },
                  });
                }}
              >
                <MaterialIcons name="map" size={20} color="#fff" />
                <Text style={styles.outdoorNavButtonText}>Open Outdoor Directions</Text>
              </Pressable>
            </View>
          )}

          {/* Vertical segment card */}
          {segmentResults.length > 0 && segmentResults[activeSegmentIndex]?.segment?.type === "vertical" && (
            <View style={styles.outdoorCard}>
              <MaterialIcons
                name={segmentResults[activeSegmentIndex].segment.transitionType === "elevator" ? "elevator" : "stairs"}
                size={40}
                color={MAROON}
              />
              <Text style={styles.outdoorCardTitle}>
                Take the {segmentResults[activeSegmentIndex].segment.transitionType}
              </Text>
              <Text style={styles.outdoorCardSubtext}>
                Floor {FLOOR_META[segmentResults[activeSegmentIndex].segment.fromFloor]?.floorLabel} → Floor {FLOOR_META[segmentResults[activeSegmentIndex].segment.toFloor]?.floorLabel}
              </Text>
            </View>
          )}

          {/* Floor Plan with Route */}
          <View 
            testID="indoor-floor-plan-container"
            style={styles.floorPlanContainer}
            {...(selectionMode ? { onStartShouldSetResponder: () => true, onResponderRelease: handleMapPress } : {})}
          >
            {displayedFloor?.image ? (
              <View style={styles.mapWrapper}>
                <Image
                  source={displayedFloor.image}
                  style={styles.floorPlanImage}
                  resizeMode="contain"
                />
                {/* SVG Overlay for Route and Markers */}
                <Svg
                  testID="indoor-route-overlay"
                  style={styles.svgOverlay}
                  width={MAP_IMAGE_WIDTH}
                  height={MAP_IMAGE_HEIGHT}
                >
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
                        testID="indoor-route-overlay-path"
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
          </View>

          {selectedBuilding?.floors?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.floorSelectorContent}
              style={styles.floorSelectorContainer}
            >
              {selectedBuilding.floors.map((floor, idx) => (
                <Pressable
                  key={floor.id}
                  style={[
                    styles.floorButton,
                    selectedFloorIdx === idx && styles.floorButtonActive,
                    browsingLocked && styles.selectorDisabled,
                  ]}
                  disabled={browsingLocked}
                  onPress={() => handleFloorChange(idx)}
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
          )}

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
                  testID="accessibility-route-toggle"
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

        {/* Transition Preference Modal (stairs vs elevator) */}
        <Modal
          testID="transition-preference-modal"
          visible={showTransitionModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTransitionModal(false)}
        >
          <Pressable testID="transition-modal-overlay" style={styles.modalOverlay} onPress={() => setShowTransitionModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>How would you like to change floors?</Text>
              <Pressable
                style={styles.modalOption}
                onPress={() => { setTransitionPref("stairs"); setShowTransitionModal(false); }}
              >
                <MaterialIcons name="stairs" size={28} color={MAROON} />
                <View style={styles.modalOptionText}>
                  <Text style={styles.modalOptionLabel}>Stairs</Text>
                  <Text style={styles.modalOptionHint}>Faster route</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.modalOption}
                onPress={() => { setTransitionPref("elevator"); setShowTransitionModal(false); }}
              >
                <MaterialIcons name="elevator" size={28} color={BLUE} />
                <View style={styles.modalOptionText}>
                  <Text style={styles.modalOptionLabel}>Elevator</Text>
                  <Text style={styles.modalOptionHint}>Accessible route</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
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
  explorerPanel: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f7f1f3",
    borderWidth: 1,
    borderColor: "#ead7dd",
  },
  campusToggleContainer: {
    flexDirection: "row",
    gap: 10,
  },
  campusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dcc3cb",
    alignItems: "center",
  },
  campusButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: MAROON,
  },
  campusButtonTextActive: {
    color: "#fff",
  },
  buildingSelectorContainer: {
    marginTop: 14,
  },
  buildingSelectorContent: {
    gap: 8,
    paddingRight: 4,
  },
  buildingChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4d7db",
  },
  buildingChipActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  buildingChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#654c54",
  },
  buildingChipTextActive: {
    color: "#fff",
  },
  floorSelectorContainer: {
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  floorSelectorContent: {
    gap: 10,
    paddingHorizontal: 16,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  floorButton: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dccfd3",
    paddingHorizontal: 12,
  },
  floorButtonActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  floorButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#654c54",
  },
  floorButtonTextActive: {
    color: "#fff",
  },
  selectorDisabled: {
    opacity: 0.55,
  },
  // Keeps search + dropdown above the Walking chip (Android elevation draw order).
  searchColumnWrapper: {
    zIndex: 1000,
    elevation: 20,
    backgroundColor: "#fff",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  /** Only the two field rows + swap; swap top % is relative to this so it stays centered in the gap */
  searchInputsBlock: {
    position: "relative",
    marginBottom: 8,
  },
  inputRowContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputRowContainerStart: {
    marginBottom: 14,
  },
  inputRowContainerDest: {
    marginBottom: 0,
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
    right: 44,
    top: "50%",
    marginTop: -16,
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
    overflow: "hidden",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 100,
  },
  searchResultsScroll: {
    maxHeight: 180,
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
    zIndex: 0,
    elevation: 0,
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
    elevation: 0,
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
  accessibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  accessibilityLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  accessibilityLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginLeft: 8,
  },
  accessibilityLabelActive: {
    color: BLUE,
  },
  accessibilityHint: {
    fontSize: 12,
    color: "#999",
    flex: 1,
    textAlign: "right",
    marginRight: 10,
  },
  // Cross-floor transition prompt
  transitionPrompt: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fff5f0",
    borderBottomWidth: 1,
    borderBottomColor: "#f0d0c7",
  },
  transitionPromptText: {
    flex: 1,
    marginHorizontal: 10,
    fontSize: 14,
    color: MAROON,
    fontWeight: "500",
  },
  // Segment tabs
  segmentTabs: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fafafa",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  segmentTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    gap: 4,
  },
  segmentTabActive: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: MAROON,
  },
  segmentTabTextActive: {
    color: "#fff",
  },
  // Transition modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: SCREEN_WIDTH - 64,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#f8f8f8",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8e8e8",
  },
  modalOptionText: {
    marginLeft: 16,
  },
  modalOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  modalOptionHint: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  // Outdoor / vertical segment cards
  outdoorCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f9f5ef",
    borderWidth: 1,
    borderColor: "#e0d8ce",
  },
  outdoorCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },
  outdoorCardSubtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  outdoorNavButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MAROON,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
  },
  outdoorNavButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});

IndoorDirectionsScreen.propTypes = {
  route: PropTypes.shape({
    params: PropTypes.object,
  }),
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
    goBack: PropTypes.func,
  }),
};
