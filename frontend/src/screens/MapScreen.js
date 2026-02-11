import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  Image,
  Modal,
} from "react-native";
import MapView, { Polygon, Polyline, Marker } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import CampusToggle from "../components/CampusToggle";
import campuses from "../data/campuses.json";
import shuttleSchedule from "../data/shuttleSchedule.json";

import { useDefaultStartMyLocation } from "../hooks/useDefaultStartMyLocation";
import { useDirectionsRoute } from "../hooks/useDirectionsRoute";
import { findBuildingUserIsIn } from "../utils/geo";
import { getUserCoords, watchUserCoords } from "../services/locationService";

const campusList = [campuses.sgw, campuses.loyola].filter(Boolean);
const defaultCampusId = campuses.sgw?.id ?? campusList[0]?.id;

const MAROON = "#95223D";

const getPolygonCenter = (points = []) => {
  if (!points.length) return null;

  const totals = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: totals.latitude / points.length,
    longitude: totals.longitude / points.length,
  };
};

const getAmenities = (building) => {
  const a = building?.amenities ?? {};
  return {
    bathrooms: Boolean(a.bathrooms),
    waterFountains: Boolean(a.waterFountains),
    genderNeutralBathrooms: Boolean(a.genderNeutralBathrooms),
    wheelchairAccessible: Boolean(
      a.wheelchairAccessible ??
        a.wheelchairAccessibleEntrances ??
        a.wheelchairAccessibleEntrance,
    ),
  };
};

export default function MapScreen() {
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Building info bottom sheet
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [currentBuilding, setCurrentBuilding] = useState(null);

  // Start/Destination inputs
  const [activeField, setActiveField] = useState(null);
  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");
  const [hasLocationPerm, setHasLocationPerm] = useState(false);
  const [startCampusId, setStartCampusId] = useState(null);
  const [destCampusId, setDestCampusId] = useState(null);

  // coords for directions
  const [startCoord, setStartCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  const [userCoord, setUserCoord] = useState(null);
  const [travelMode, setTravelMode] = useState("walking");
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [navActive, setNavActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [transitSubMode, setTransitSubMode] = useState("shuttle"); // shuttle | public
  const [isShuttleModalOpen, setIsShuttleModalOpen] = useState(false);
  const [transitRouteIndex, setTransitRouteIndex] = useState(0);
  const [isTransitCollapsed, setIsTransitCollapsed] = useState(false);
  const simTimerRef = useRef(null);
  const simIndexRef = useRef(0);
  const simActiveRef = useRef(false);

  const mapRef = useRef(null);

  const selectedCampus = useMemo(
    () => campusList.find((campus) => campus.id === selectedCampusId),
    [selectedCampusId],
  );

  // campuses other than the selected one
  const otherCampuses = useMemo(
    () => campusList.filter((c) => c.id !== selectedCampusId),
    [selectedCampusId],
  );

  const allBuildings = useMemo(
    () =>
      campusList.flatMap((campus) =>
        campus.buildings.map((building) => ({
          ...building,
          __campusId: campus.id,
        })),
      ),
    [],
  );

  const getBuildingName = (b) => b?.name || b?.label || "Building";
  const getBuildingKey = (campusId, b) =>
    `${campusId}:${b?.id ?? b?.name ?? b?.label ?? "unknown"}`;
  const isCurrentBuilding = (campusId, building) => {
    if (!currentBuilding) return false;
    return (
      currentBuilding.__campusId === campusId &&
      getBuildingKey(campusId, currentBuilding) ===
        getBuildingKey(campusId, building)
    );
  };

  const openBuilding = (building) => {
    setShowDirectionsPanel(false);
    setSelectedBuilding(building);

    const center = getPolygonCenter(building.coordinates);
    if (center) {
      mapRef.current?.animateToRegion(
        { ...center, latitudeDelta: 0.003, longitudeDelta: 0.003 },
        500,
      );
    }
  };

  const handleBuildingPress = (building) => {
    setHasInteracted(true);
    const name = getBuildingName(building);
    const center = getPolygonCenter(building.coordinates);

    // Only fill if user explicitly selected a field first
    if (activeField === "start") {
      setStartText(name);
      if (center) setStartCoord(center);
      setStartCampusId(building.__campusId ?? selectedCampus?.id ?? null);
      setActiveField(null);
      Keyboard.dismiss();
      return;
    }

    if (activeField === "dest") {
      setDestText(name);
      if (center) setDestCoord(center);
      setDestCampusId(building.__campusId ?? selectedCampus?.id ?? null);
      setActiveField(null);
      Keyboard.dismiss();
      return;
    }

    openBuilding(building);
  };

  const normalizeText = (text = "") =>
    text.toLowerCase().replace(/[^a-z0-9]/g, "");

  const getShuttleDepartures = (now = new Date(), schedule) => {
    const day = now.getDay(); // 0 Sun ... 6 Sat
    if (day === 0 || day === 6) return { active: false, times: [] };

    const isFriday = day === 5;
    const parseTime = (t) => {
      const [h, m] = t.split(":").map((v) => parseInt(v, 10));
      return h * 60 + m;
    };
    const startMinutes = isFriday
      ? parseTime(schedule.friday.start)
      : parseTime(schedule.weekday.start);
    const endMinutes = isFriday
      ? parseTime(schedule.friday.end)
      : parseTime(schedule.weekday.end);
    const interval = isFriday
      ? schedule.friday.intervalMin
      : schedule.weekday.intervalMin;

    const minutesNow = now.getHours() * 60 + now.getMinutes();
    if (minutesNow > endMinutes) return { active: false, times: [] };

    const nextTimes = [];
    const first =
      minutesNow <= startMinutes
        ? startMinutes
        : minutesNow +
          ((interval - ((minutesNow - startMinutes) % interval)) % interval);

    for (
      let t = first;
      t <= endMinutes && nextTimes.length < 6;
      t += interval
    ) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      const label = `${h.toString().padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
      nextTimes.push(label);
    }

    return { active: true, times: nextTimes };
  };

  const shuttleSchedules = shuttleSchedule.routes.map((route) => ({
    id: route.id,
    from: route.from,
    to: route.to,
    stop: route.stopName,
    address: route.address,
    weekday: route.weekday,
    friday: route.friday,
    estimatedTravelMin: route.estimatedTravelMin,
  }));

  const filteredShuttleSchedules = useMemo(() => {
    if (!startCampusId || !destCampusId) return shuttleSchedules;
    if (startCampusId === "sgw" && destCampusId === "loyola") {
      return shuttleSchedules.filter((s) => s.from === "sgw");
    }
    if (startCampusId === "loyola" && destCampusId === "sgw") {
      return shuttleSchedules.filter((s) => s.from === "loyola");
    }
    return shuttleSchedules;
  }, [startCampusId, destCampusId, shuttleSchedules]);

  const stripHtml = (html = "") => html.replace(/<[^>]+>/g, "");

  const distanceMeters = (a, b) => {
    if (!a || !b) return Infinity;
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const stopSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsSimulating(false);
  };

  const selectBuildingForField = (building, field) => {
    const name = getBuildingName(building);
    const center = getPolygonCenter(building.coordinates);

    if (field === "start") {
      setStartText(name);
      if (center) setStartCoord(center);
      setStartCampusId(building.__campusId ?? null);
    } else if (field === "dest") {
      setDestText(name);
      if (center) setDestCoord(center);
      setDestCampusId(building.__campusId ?? null);
    }

    setActiveField(null);
    Keyboard.dismiss();
  };

  const selectMyLocationForField = async (field) => {
    const coords = await getUserCoords();
    if (!coords) return;

    if (field === "start") {
      setStartText("My location");
      setStartCoord(coords);
      setStartCampusId(null);
    } else if (field === "dest") {
      setDestText("My location");
      setDestCoord(coords);
      setDestCampusId(null);
    }

    setActiveField(null);
    Keyboard.dismiss();
  };

  const searchResults = useMemo(() => {
    if (!activeField) return [];
    const query = activeField === "start" ? startText : destText;
    const normalized = normalizeText(query);
    if (!normalized || normalized.length < 2) return [];

    return allBuildings
      .filter((building) => {
        const name = getBuildingName(building);
        return normalizeText(name).includes(normalized);
      })
      .slice(0, 6);
  }, [activeField, startText, destText, allBuildings]);

  const shouldShowMyLocationOption = useMemo(() => {
    if (!activeField) return false;
    const query = activeField === "start" ? startText : destText;
    const normalized = normalizeText(query);
    return normalized.startsWith("my");
  }, [activeField, startText, destText]);

  // Bottom-sheet "Directions" button action
  const setDestinationToSelectedBuilding = () => {
    if (!selectedBuilding) return;

    const name = getBuildingName(selectedBuilding);
    const center = getPolygonCenter(selectedBuilding.coordinates);

    setDestText(name);
    if (center) setDestCoord(center);
    setDestCampusId(selectedBuilding.__campusId ?? selectedCampus?.id ?? null);

    setSelectedBuilding(null);
    setShowDirectionsPanel(true);
    Keyboard.dismiss();
  };

  const handleGoPress = () => {
    if (!startCoord || !destCoord) return;
    setFollowUser(true);
    setNavActive(true);
    setCurrentStepIndex(0);
    const firstInstruction = routeInfo?.steps?.[0]?.instruction;
    if (firstInstruction && speechEnabled) {
      Speech.stop();
      Speech.speak(stripHtml(firstInstruction));
    }

    if (routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
    } else if (userCoord) {
      mapRef.current?.animateToRegion(
        { ...userCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 },
        500,
      );
    }
  };

  const handleSimulatePress = () => {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    if (!routeCoords.length) return;
    setIsSimulating(true);
    setFollowUser(true);
    setHasLocationPerm(true);
    simIndexRef.current = 0;
    setUserCoord(routeCoords[0]);

    simTimerRef.current = setInterval(() => {
      simIndexRef.current += 1;
      if (simIndexRef.current >= routeCoords.length) {
        stopSimulation();
        return;
      }
      setUserCoord(routeCoords[simIndexRef.current]);
    }, 1000);
  };

  const isCrossCampusTrip =
    startCampusId && destCampusId && startCampusId !== destCampusId;

  const handleSwapStartDest = () => {
    const nextStartText = destText;
    const nextDestText = startText;
    const nextStartCoord = destCoord;
    const nextDestCoord = startCoord;
    const nextStartCampusId = destCampusId;
    const nextDestCampusId = startCampusId;

    setStartText(nextStartText);
    setDestText(nextDestText);
    setStartCoord(nextStartCoord);
    setDestCoord(nextDestCoord);
    setStartCampusId(nextStartCampusId);
    setDestCampusId(nextDestCampusId);
  };

  useEffect(() => {
    if (mapRef.current && selectedCampus) {
      setSelectedBuilding(null);
      mapRef.current.animateToRegion(selectedCampus.region, 600);
    }
  }, [selectedCampus]);

  // Track user location for "current building" highlight + blue dot
  useEffect(() => {
    let cancelled = false;
    let subscription = null;

    (async () => {
      try {
        const sub = await watchUserCoords((coords) => {
          if (cancelled) return;
          if (simActiveRef.current) return;
          setHasLocationPerm(true);
          setUserCoord(coords);
        });

        if (cancelled) return;
        subscription = sub;
        if (!sub) setHasLocationPerm(false);
      } catch (err) {
        if (!cancelled) setHasLocationPerm(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    simActiveRef.current = isSimulating;
  }, [isSimulating]);

  useEffect(() => {
    if (!userCoord) {
      setCurrentBuilding(null);
      return;
    }

    const found = findBuildingUserIsIn(userCoord, allBuildings);
    setCurrentBuilding(found ?? null);
  }, [userCoord, allBuildings]);

  useEffect(() => {
    if (startText !== "My location") return;
    if (currentBuilding?.__campusId) {
      setStartCampusId(currentBuilding.__campusId);
    }
  }, [startText, currentBuilding]);

  // Default Start = current location (only if Start is empty)
  useDefaultStartMyLocation({
    startText,
    setStartText,
    setHasLocationPerm,
    setStartCoord,
  });

  // Route coordinates from Google Directions
  const directionsMode =
    travelMode === "transit"
      ? transitSubMode === "public"
        ? "transit"
        : null
      : travelMode;

  const { routeCoords, routeInfo, routeOptions } = useDirectionsRoute({
    startCoord,
    destCoord,
    mapRef,
    mode: directionsMode,
    routeIndex: transitRouteIndex,
  });

  const canShowDirectionsPanel = Boolean(
    showDirectionsPanel && startCoord && destCoord,
  );

  useEffect(() => {
    if (!startCoord || !destCoord) {
      setShowDirectionsPanel(false);
      setNavActive(false);
      setFollowUser(false);
      setCurrentStepIndex(0);
      stopSimulation();
      return;
    }

    setShowDirectionsPanel(true);
  }, [startCoord, destCoord]);

  useEffect(() => {
    if (isSimulating) {
      setIsTransitCollapsed(true);
    }
  }, [isSimulating]);

  useEffect(() => {
    if (!isCrossCampusTrip && travelMode === "transit") {
      setTravelMode("walking");
    }
  }, [isCrossCampusTrip, travelMode]);

  useEffect(() => {
    if (!followUser || !userCoord) return;
    mapRef.current?.animateToRegion(
      { ...userCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 },
      500,
    );
  }, [followUser, userCoord]);

  useEffect(() => {
    if (!navActive || !userCoord || !routeInfo?.steps?.length) return;
    const currentStep = routeInfo.steps[currentStepIndex];
    if (!currentStep?.endLocation) return;

    const meters = distanceMeters(userCoord, currentStep.endLocation);
    if (meters > 25) return;

    const nextIndex = Math.min(
      currentStepIndex + 1,
      routeInfo.steps.length - 1,
    );

    if (nextIndex !== currentStepIndex) {
      setCurrentStepIndex(nextIndex);
      const nextInstruction = routeInfo.steps[nextIndex]?.instruction;
      if (nextInstruction && speechEnabled) {
        Speech.stop();
        Speech.speak(stripHtml(nextInstruction));
      }
    }
  }, [navActive, userCoord, routeInfo, currentStepIndex, speechEnabled]);

  useEffect(() => {
    return () => {
      stopSimulation();
    };
  }, []);

  if (!selectedCampus) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* <Text style={styles.title}>Select Your Campus</Text> */}
        {!hasInteracted && (
          <Text style={styles.subtitle}>
            Choose a campus to explore buildings and get directions
          </Text>
        )}
        {currentBuilding && (
          <Text style={styles.currentBuildingText}>
            Current building: {getBuildingName(currentBuilding)}
          </Text>
        )}
      </View>

      <CampusToggle
        campuses={campusList}
        selectedId={selectedCampusId}
        onSelect={(id) => {
          setSelectedCampusId(id);
          setHasInteracted(true);
        }}
      />

      <View style={{ flex: 1 }}>
        {/* red input box */}
        <View style={styles.redBox}>
          <View style={styles.inputRow}>
            <Image
              source={require("../../assets/magnifier.png")}
              style={styles.searchIcon}
              resizeMode="contain"
            />
            <TextInput
              testID="start-input"
              value={startText}
              onChangeText={(t) => {
                setHasInteracted(true);
                setStartText(t);
                // If they type random text, it no longer matches a known coordinate
                if (t !== "My location") setStartCoord(null);
                if (!t) setStartCampusId(null);
                if (!t) setShowDirectionsPanel(false);
              }}
              placeholder="Search or click on a building..."
              placeholderTextColor="#EED7DE"
              style={[styles.input, !startText && styles.inputPlaceholder]}
              onFocus={() => {
                setHasInteracted(true);
                setActiveField("start");
              }}
            />
            {startText.length > 0 && (
              <Pressable
                onPress={() => {
                  setStartText("");
                  setStartCoord(null);
                }}
                hitSlop={10}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          <View style={[styles.inputRow, { marginBottom: 0 }]}>
            <Image
              source={require("../../assets/magnifier.png")}
              style={styles.searchIcon}
              resizeMode="contain"
            />
            <TextInput
              testID="dest-input"
              value={destText}
              onChangeText={(t) => {
                setHasInteracted(true);
                setDestText(t);
                setDestCoord(null);
                if (!t) setDestCampusId(null);
                if (!t) setShowDirectionsPanel(false);
              }}
              placeholder="Search or click on a building..."
              placeholderTextColor="#EED7DE"
              style={[styles.input, !destText && styles.inputPlaceholder]}
              onFocus={() => {
                setHasInteracted(true);
                setActiveField("dest");
              }}
            />
            {destText.length > 0 && (
              <Pressable
                onPress={() => {
                  setDestText("");
                  setDestCoord(null);
                }}
                hitSlop={10}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </Pressable>
            )}
          </View>

          <Pressable style={styles.swapBtn} onPress={handleSwapStartDest}>
            <MaterialIcons name="swap-vert" size={18} color="#95223D" />
          </Pressable>

          {(shouldShowMyLocationOption || searchResults.length > 0) && (
            <View style={styles.searchResults}>
              {shouldShowMyLocationOption && (
                <Pressable
                  onPress={() => selectMyLocationForField(activeField)}
                  style={styles.searchResultRow}
                >
                  <Text style={styles.searchResultText}>My location</Text>
                </Pressable>
              )}
              {searchResults.map((building) => (
                <Pressable
                  key={getBuildingKey(building.__campusId, building)}
                  onPress={() => selectBuildingForField(building, activeField)}
                  style={styles.searchResultRow}
                >
                  <Text style={styles.searchResultText}>
                    {getBuildingName(building)}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={selectedCampus.region}
          zoomEnabled
          scrollEnabled
          rotateEnabled
          pitchEnabled
          showsUserLocation={hasLocationPerm}
          showsCompass
          showsScale
          onPress={() => setActiveField(null)}
        >
          {selectedCampus.buildings.map((building) => {
            const center = getPolygonCenter(building.coordinates);
            const label = building.label || building.name;

            return (
              <React.Fragment key={building.id}>
                <Polygon
                  testID={`building-${building.id}`}
                  coordinates={building.coordinates}
                  fillColor={
                    isCurrentBuilding(selectedCampus.id, building)
                      ? "rgba(37, 99, 235, 0.35)"
                      : "rgba(149, 34, 61, 0.25)"
                  }
                  strokeColor={
                    isCurrentBuilding(selectedCampus.id, building)
                      ? "rgba(37, 99, 235, 0.95)"
                      : "rgba(149, 34, 61, 0.9)"
                  }
                  strokeWidth={2}
                  tappable
                  onPress={() => handleBuildingPress(building)}
                />

                {center && label ? (
                  <Marker
                    coordinate={center}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    pointerEvents="none"
                  >
                    <View style={styles.buildingLabel}>
                      <Text style={styles.buildingLabelText}>{label}</Text>
                    </View>
                  </Marker>
                ) : null}
              </React.Fragment>
            );
          })}

          {/* show other campus buildings too */}
          {otherCampuses.map((campus) =>
            campus.buildings.map((building) => {
              const center = getPolygonCenter(building.coordinates);
              const label = building.label || building.name;
              const key = `${campus.id}-${building.id}`;

              return (
                <React.Fragment key={key}>
                  <Polygon
                    testID={`building-${campus.id}-${building.id}`}
                    coordinates={building.coordinates}
                    fillColor={
                      isCurrentBuilding(campus.id, building)
                        ? "rgba(37, 99, 235, 0.2)"
                        : "rgba(149, 34, 61, 0.10)"
                    }
                    strokeColor={
                      isCurrentBuilding(campus.id, building)
                        ? "rgba(37, 99, 235, 0.85)"
                        : "rgba(149, 34, 61, 0.55)"
                    }
                    strokeWidth={2}
                    tappable
                    onPress={() => handleBuildingPress(building)}
                  />

                  {center && label ? (
                    <Marker
                      coordinate={center}
                      anchor={{ x: 0.5, y: 0.5 }}
                      tracksViewChanges={false}
                      pointerEvents="none"
                    >
                      <View style={styles.buildingLabel}>
                        <Text style={styles.buildingLabelText}>{label}</Text>
                      </View>
                    </Marker>
                  ) : null}
                </React.Fragment>
              );
            }),
          )}

          {/* Draw the path */}
          {routeCoords.length > 0 && (
            <Polyline
              testID="route-polyline"
              coordinates={routeCoords}
              strokeWidth={5}
              strokeColor="#2563eb"
            />
          )}
        </MapView>

        {/* Bottom sheet */}
        {selectedBuilding && (
          <View style={styles.sheetWrap} pointerEvents="box-none">
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetHeaderLeft}>
                  <View style={styles.buildingIcon}>
                    <Image
                      source={require("../../assets/Clogo.png")}
                      style={styles.buildingIconImage}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.buildingTitle} numberOfLines={1}>
                      {getBuildingName(selectedBuilding).toUpperCase()}
                    </Text>

                    {selectedBuilding.address ? (
                      <Text style={styles.buildingSub} numberOfLines={2}>
                        {selectedBuilding.address}
                      </Text>
                    ) : (
                      <Text style={styles.buildingSub} numberOfLines={2}>
                        No address available
                      </Text>
                    )}

                    {(() => {
                      const a = getAmenities(selectedBuilding);
                      return (
                        <View style={styles.amenitiesWrap}>
                          <Text style={styles.amenitiesTitle}>Amenities</Text>

                          <View style={styles.amenityRow}>
                            <View style={styles.amenityLeft}>
                              <MaterialIcons name="wc" size={16} color={MAROON} />
                              <Text style={styles.amenityLabel}>Bathrooms</Text>
                            </View>
                            <Text style={styles.amenityValue}>
                              {a.bathrooms ? "Available" : "Not available"}
                            </Text>
                          </View>

                          <View style={styles.amenityRow}>
                            <View style={styles.amenityLeft}>
                              <MaterialIcons name="water-drop" size={16} color={MAROON} />
                              <Text style={styles.amenityLabel}>Water fountains</Text>
                            </View>
                            <Text style={styles.amenityValue}>
                              {a.waterFountains ? "Available" : "Not available"}
                            </Text>
                          </View>

                          <View style={styles.amenityRow}>
                            <View style={styles.amenityLeft}>
                              <MaterialIcons name="wc" size={16} color={MAROON} />
                              <Text style={styles.amenityLabel}>Gender-neutral bathrooms</Text>
                            </View>
                            <Text style={styles.amenityValue}>
                              {a.genderNeutralBathrooms ? "Yes" : "No"}
                            </Text>
                          </View>
                          <View style={styles.amenityRow}>
                            <View style={styles.amenityLeft}>
                              <MaterialIcons name="accessible" size={16} color={MAROON} />
                              <Text style={styles.amenityLabel}>Wheelchair accessible</Text>
                            </View>
                            <Text style={styles.amenityValue}>
                              {a.wheelchairAccessible ? "Yes" : "No"}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                </View>

                <Pressable
                  onPress={() => setSelectedBuilding(null)}
                  hitSlop={12}
                  style={styles.closeBtn}
                >
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>
              </View>

              {/* Directions button */}
              <Pressable
                style={styles.directionsBtn}
                onPress={setDestinationToSelectedBuilding}
              >
                <Image
                  source={require("../../assets/directionsLogo.png")}
                  style={styles.directionsBtnIcon}
                  resizeMode="contain"
                />
                <Text style={styles.directionsBtnText}>Directions</Text>
              </Pressable>
            </View>
          </View>
        )}

        {canShowDirectionsPanel && (
          <View style={styles.directionsWrap} pointerEvents="box-none">
            <View style={styles.directionsPanel}>
              <View style={styles.modeRow}>
                <Pressable
                  style={[
                    styles.modeBtn,
                    travelMode === "driving" && styles.modeBtnActive,
                  ]}
                  onPress={() => setTravelMode("driving")}
                >
                  <MaterialIcons
                    name="directions-car"
                    size={18}
                    color={travelMode === "driving" ? MAROON : "#111"}
                  />
                  <Text
                    style={[
                      styles.modeBtnLabel,
                      travelMode === "driving" && styles.modeBtnTextActive,
                    ]}
                  >
                    Car
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modeBtn,
                    travelMode === "walking" && styles.modeBtnActive,
                  ]}
                  onPress={() => setTravelMode("walking")}
                >
                  <MaterialIcons
                    name="directions-walk"
                    size={18}
                    color={travelMode === "walking" ? MAROON : "#111"}
                  />
                  <Text
                    style={[
                      styles.modeBtnLabel,
                      travelMode === "walking" && styles.modeBtnTextActive,
                    ]}
                  >
                    Walk
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.modeBtn,
                    travelMode === "bicycling" && styles.modeBtnActive,
                  ]}
                  onPress={() => setTravelMode("bicycling")}
                >
                  <MaterialIcons
                    name="directions-bike"
                    size={18}
                    color={travelMode === "bicycling" ? MAROON : "#111"}
                  />
                  <Text
                    style={[
                      styles.modeBtnLabel,
                      travelMode === "bicycling" && styles.modeBtnTextActive,
                    ]}
                  >
                    Bike
                  </Text>
                </Pressable>

                {isCrossCampusTrip && (
                  <Pressable
                    style={[
                      styles.modeBtn,
                      travelMode === "transit" && styles.modeBtnActive,
                    ]}
                    onPress={() => setTravelMode("transit")}
                  >
                    <MaterialIcons
                      name="directions-transit"
                      size={18}
                      color={travelMode === "transit" ? MAROON : "#111"}
                    />
                    <Text
                      style={[
                        styles.modeBtnLabel,
                        travelMode === "transit" && styles.modeBtnTextActive,
                      ]}
                    >
                      Transit
                    </Text>
                  </Pressable>
                )}
              </View>

              {travelMode === "transit" && isCrossCampusTrip && (
                <View style={styles.shuttlePanel}>
                  <View style={styles.transitSubRow}>
                    <Pressable
                      style={[
                        styles.transitSubBtn,
                        transitSubMode === "shuttle" &&
                          styles.transitSubBtnActive,
                      ]}
                      onPress={() => {
                        setTransitSubMode("shuttle");
                        setIsShuttleModalOpen(true);
                      }}
                    >
                      <Text
                        style={[
                          styles.transitSubText,
                          transitSubMode === "shuttle" &&
                            styles.transitSubTextActive,
                        ]}
                      >
                        Shuttle
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.transitSubBtn,
                        transitSubMode === "public" &&
                          styles.transitSubBtnActive,
                      ]}
                      onPress={() => setTransitSubMode("public")}
                    >
                      <Text
                        style={[
                          styles.transitSubText,
                          transitSubMode === "public" &&
                            styles.transitSubTextActive,
                        ]}
                      >
                        Public
                      </Text>
                    </Pressable>
                  </View>

                  {transitSubMode === "public" && (
                    <>
                      <View style={styles.transitHeaderRow}>
                        <Text style={styles.shuttleNote}>
                          Showing 3 shortest public transit routes.
                        </Text>
                        <Pressable
                          onPress={() => setIsTransitCollapsed((prev) => !prev)}
                          style={styles.collapseBtn}
                        >
                          <MaterialIcons
                            name={
                              isTransitCollapsed ? "expand-less" : "expand-more"
                            }
                            size={18}
                            color={MAROON}
                          />
                        </Pressable>
                      </View>

                      {!isTransitCollapsed && (
                        <View style={styles.transitList}>
                          {routeOptions.length === 0 ? (
                            <Text style={styles.transitEmpty}>
                              No public transit routes found.
                            </Text>
                          ) : (
                            routeOptions.slice(0, 3).map((opt, idx) => {
                              const isSelected = idx === transitRouteIndex;
                              return (
                                <Pressable
                                  key={`route-${idx}`}
                                  onPress={() => setTransitRouteIndex(idx)}
                                  style={[
                                    styles.transitRow,
                                    isSelected && styles.transitRowActive,
                                  ]}
                                >
                                  <View style={styles.transitSummaryRow}>
                                    <View style={styles.transitSummaryLeft}>
                                      {(opt.transitVehicles || [])
                                        .slice(0, 3)
                                        .map((vehicle, vIdx) => {
                                          const icon =
                                            vehicle === "SUBWAY"
                                              ? "subway"
                                              : "directions-bus";
                                          const line =
                                            opt.transitLines?.[vIdx] ||
                                            "Transit";
                                          return (
                                            <View
                                              key={`veh-${idx}-${vIdx}`}
                                              style={styles.transitBadge}
                                            >
                                              <MaterialIcons
                                                name={icon}
                                                size={14}
                                                color={
                                                  isSelected ? MAROON : "#111"
                                                }
                                              />
                                              <Text
                                                style={[
                                                  styles.transitBadgeText,
                                                  isSelected &&
                                                    styles.transitLineActive,
                                                ]}
                                              >
                                                {line}
                                              </Text>
                                            </View>
                                          );
                                        })}
                                    </View>
                                    <Text style={styles.transitMeta}>
                                      {opt.durationText || "--"}
                                      {opt.durationValue &&
                                      isFinite(opt.durationValue)
                                        ? ` (ETA ${(() => {
                                            const now = new Date();
                                            const mins = Math.round(
                                              opt.durationValue / 60,
                                            );
                                            const eta = new Date(
                                              now.getTime() + mins * 60000,
                                            );
                                            const hh = eta
                                              .getHours()
                                              .toString()
                                              .padStart(2, "0");
                                            const mm = eta
                                              .getMinutes()
                                              .toString()
                                              .padStart(2, "0");
                                            return `${hh}:${mm}`;
                                          })()})`
                                        : ""}
                                    </Text>
                                  </View>
                                  <Text style={styles.transitStops}>
                                    Tap to view details
                                  </Text>
                                  {isSelected &&
                                    routeInfo?.steps?.length > 0 && (
                                      <View style={styles.transitSteps}>
                                        {routeInfo.steps.map(
                                          (step, stepIdx) => {
                                            const mode = step.travelMode;
                                            let icon = "directions-walk";
                                            if (mode === "TRANSIT") {
                                              const vehicle =
                                                step.transitDetails
                                                  ?.vehicleType || "";
                                              icon =
                                                vehicle === "SUBWAY"
                                                  ? "subway"
                                                  : "directions-bus";
                                            }
                                            return (
                                              <View
                                                key={`step-${stepIdx}`}
                                                style={styles.transitStepRow}
                                              >
                                                <MaterialIcons
                                                  name={icon}
                                                  size={16}
                                                  color="#111"
                                                />
                                                <Text
                                                  style={styles.transitStepText}
                                                >
                                                  {step.transitDetails
                                                    ?.lineShortName ||
                                                    step.transitDetails
                                                      ?.lineName ||
                                                    stripHtml(
                                                      step.instruction || "",
                                                    )}
                                                  {step.travelMode ===
                                                    "TRANSIT" && (
                                                    <>
                                                      {step.transitDetails
                                                        ?.arrivalStop && (
                                                        <Text
                                                          style={
                                                            styles.transitStopName
                                                          }
                                                        >
                                                          {" "}
                                                          (
                                                          {
                                                            step.transitDetails
                                                              .arrivalStop
                                                          }
                                                          )
                                                        </Text>
                                                      )}
                                                      {step.transitDetails
                                                        ?.numStops != null && (
                                                        <Text
                                                          style={
                                                            styles.transitStopCount
                                                          }
                                                        >
                                                          {" "}
                                                          •{" "}
                                                          {
                                                            step.transitDetails
                                                              .numStops
                                                          }{" "}
                                                          stops
                                                        </Text>
                                                      )}
                                                    </>
                                                  )}
                                                </Text>
                                              </View>
                                            );
                                          },
                                        )}
                                      </View>
                                    )}
                                </Pressable>
                              );
                            })
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              )}

              <View style={styles.routeInfoRow}>
                <View>
                  <Text style={styles.routeInfoTitle}>
                    {routeInfo?.durationText ?? "--"}
                  </Text>
                  <Text style={styles.routeInfoSub}>
                    {routeInfo?.distanceText ?? ""}
                  </Text>
                </View>

                <View style={styles.routeInfoActions}>
                  <Pressable
                    style={[
                      styles.muteBtn,
                      !speechEnabled && styles.muteBtnActive,
                    ]}
                    onPress={() => {
                      setSpeechEnabled((prev) => !prev);
                      Speech.stop();
                    }}
                  >
                    <MaterialIcons
                      name={speechEnabled ? "volume-up" : "volume-off"}
                      size={18}
                      color={speechEnabled ? "#111" : MAROON}
                    />
                  </Pressable>

                  <Pressable
                    style={[styles.simBtn, isSimulating && styles.simBtnActive]}
                    onPress={handleSimulatePress}
                  >
                    <Text
                      style={[
                        styles.simBtnText,
                        isSimulating && styles.simBtnTextActive,
                      ]}
                    >
                      {isSimulating ? "Stop" : "Simulate"}
                    </Text>
                  </Pressable>

                  <Pressable style={styles.goBtn} onPress={handleGoPress}>
                    <Text style={styles.goBtnText}>GO</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      <Modal
        visible={isShuttleModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsShuttleModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Concordia Shuttle</Text>
              <Pressable
                onPress={() => setIsShuttleModalOpen(false)}
                hitSlop={10}
                style={styles.modalClose}
              >
                <Text style={styles.modalCloseText}>X</Text>
              </Pressable>
            </View>

            {filteredShuttleSchedules.map((schedule) => {
              const { active, times } = getShuttleDepartures(
                new Date(),
                schedule,
              );
              return (
                <View key={schedule.id} style={styles.modalSection}>
                  <Text style={styles.modalSubtitle}>
                    {schedule.campus} - {schedule.stop}
                  </Text>
                  <Text style={styles.modalAddress}>{schedule.address}</Text>

                  <View style={styles.modalSchedule}>
                    <Text style={styles.modalScheduleTitle}>Schedule</Text>
                    <Text style={styles.modalScheduleText}>
                      Monday to Thursday: every {schedule.weekday.intervalMin}{" "}
                      minutes ({schedule.weekday.start}–{schedule.weekday.end})
                    </Text>
                    <Text style={styles.modalScheduleText}>
                      Friday: every {schedule.friday.intervalMin} minutes (
                      {schedule.friday.start}–{schedule.friday.end})
                    </Text>
                  </View>

                  <View style={styles.modalDepartures}>
                    <Text style={styles.modalScheduleTitle}>
                      Next departures
                    </Text>
                    {!active || times.length === 0 ? (
                      <Text style={styles.modalEmpty}>
                        No more departures today.
                      </Text>
                    ) : (
                      times.map((t) => (
                        <View
                          key={`${schedule.id}-${t}`}
                          style={styles.departureRow}
                        >
                          <Image
                            source={require("../../assets/Clogo.png")}
                            style={styles.departureIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.departureTime}>{t}</Text>
                          <Text style={styles.departureEta}>
                            ETA{" "}
                            {(() => {
                              const [h, m] = t
                                .split(":")
                                .map((v) => parseInt(v, 10));
                              const mins =
                                h * 60 + m + (schedule.estimatedTravelMin || 0);
                              const eh = Math.floor(mins / 60) % 24;
                              const em = mins % 60;
                              return `${eh.toString().padStart(2, "0")}:${em
                                .toString()
                                .padStart(2, "0")}`;
                            })()}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  title: { fontSize: 26, fontWeight: "700", color: MAROON },
  subtitle: { marginTop: 4, fontSize: 15, color: "#666" },
  currentBuildingText: { marginTop: 6, fontSize: 13, color: "#2563eb" },
  buildingLabel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(149, 34, 61, 0.35)",
  },
  buildingLabelText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#95223D",
  },

  map: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#666" },

  redBox: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: MAROON,
    borderRadius: 22,
    padding: 12,
  },
  inputRow: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0,
    flex: 1,
  },
  searchIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    opacity: 0.8,
  },
  inputPlaceholder: {
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "500",
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    overflow: "hidden",
  },
  searchResultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  searchResultText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  clearBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  swapBtn: {
    position: "absolute",
    right: 350,
    top: 47,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E6E6E6",
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sheetHeaderLeft: { flexDirection: "row", gap: 12, flex: 1, paddingRight: 8 },

  buildingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MAROON,
    alignItems: "center",
    justifyContent: "center",
  },
  buildingIconImage: { width: 28, height: 28 },
  buildingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    letterSpacing: 0.4,
  },
  buildingSub: { marginTop: 4, fontSize: 13, color: "#666", lineHeight: 18 },

  amenitiesWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
  },
  amenitiesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  amenityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  amenityLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
    flexShrink: 1,
  },
  amenityValue: {
    fontSize: 13,
    color: "#666",
    fontWeight: "800",
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, color: "#333", fontWeight: "700" },

  directionsBtn: {
    marginTop: 16,
    backgroundColor: MAROON,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  directionsBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  directionsBtnIcon: { width: 18, height: 18 },
  directionsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  directionsPanel: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  modeBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  modeBtnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
  },
  modeBtnTextActive: {
    color: MAROON,
  },
  shuttlePanel: {
    marginTop: 8,
    marginBottom: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
  },
  transitSubRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  transitSubBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  transitSubBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  transitSubText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },
  transitSubTextActive: {
    color: MAROON,
  },
  shuttleBtn: {
    backgroundColor: MAROON,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  shuttleBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  shuttleNote: {
    marginTop: 6,
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },
  transitList: {
    marginTop: 8,
    gap: 8,
  },
  transitSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  transitSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  transitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#F3F3F3",
  },
  transitBadgeText: {
    fontSize: 11,
    color: "#111",
    fontWeight: "700",
  },
  transitMeta: {
    fontSize: 11,
    color: "#555",
    fontWeight: "700",
  },
  transitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  collapseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  transitRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  transitRowActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.06)",
  },
  transitLine: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
  },
  transitLineActive: {
    color: MAROON,
  },
  transitStops: {
    marginTop: 2,
    fontSize: 11,
    color: "#444",
  },
  transitTimes: {
    marginTop: 2,
    fontSize: 11,
    color: "#666",
  },
  transitEmpty: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    paddingVertical: 6,
  },
  transitSteps: {
    marginTop: 6,
    gap: 4,
  },
  transitStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transitStepText: {
    fontSize: 11,
    color: "#333",
    flex: 1,
  },
  transitStopCount: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 30,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCloseText: { fontSize: 16, color: "#333", fontWeight: "700" },
  modalSubtitle: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "700",
    color: "#111",
  },
  modalAddress: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
  modalSchedule: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F7F7F7",
  },
  modalSection: {
    marginTop: 12,
  },
  modalScheduleTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
  },
  modalScheduleText: {
    marginTop: 4,
    fontSize: 12,
    color: "#444",
  },
  modalDepartures: {
    marginTop: 12,
  },
  modalEmpty: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
  },
  departureRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  departureIcon: { width: 20, height: 20 },
  departureTime: {
    width: 56,
    fontSize: 14,
    fontWeight: "700",
    color: "#111",
    fontVariant: ["tabular-nums"],
  },
  departureEta: {
    marginLeft: "auto",
    width: 70,
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeInfoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  routeInfoSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
  goBtn: {
    backgroundColor: MAROON,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  goBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  simBtn: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#fff",
  },
  simBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  simBtnText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "700",
  },
  simBtnTextActive: {
    color: MAROON,
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  muteBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
});
