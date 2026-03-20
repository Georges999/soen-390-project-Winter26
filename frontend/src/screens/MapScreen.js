import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, Pressable, Keyboard, FlatList } from "react-native";
import MapView, { Polygon, Marker } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import CampusToggle from "../components/CampusToggle";
import SearchBox from "../components/SearchBox";
import BuildingBottomSheet from "../components/BuildingBottomSheet";
import DirectionsPanel from "../components/DirectionsPanel";
import ShuttleModal from "../components/ShuttleModal";
import RouteOverlay from "../components/RouteOverlay";
import campuses from "../data/campuses.json";
import shuttleSchedule from "../data/shuttleSchedule.json";
import { filterPOIsByMode } from "../utils/poiFilter";

import { useDefaultStartMyLocation } from "../hooks/useDefaultStartMyLocation";
import { useDirectionsRoute } from "../hooks/useDirectionsRoute";
import { useCurrentBuilding } from "../hooks/useCurrentBuilding";
import { useNavigationSteps } from "../hooks/useNavigationSteps";
import {
  useMapRoutingController,
  useMapRoutingSideEffects,
  useMapRoutingActions,
} from "../hooks/useMapRoutingController";
import { useSimulation } from "../hooks/useSimulation";
import { useUserLocation } from "../hooks/useUserLocation";
import { getPolygonCenter } from "../utils/geoUtils";
import { normalizeText, stripHtml } from "../utils/textUtils";
import {
  getShuttleDepartures,
  mapShuttleSchedules,
} from "../utils/shuttleUtils";
import { getUserCoords } from "../services/locationService";
import { fetchNearbyPOIs, categoryToType } from "../services/poiService";
import styles from "./MapScreen.styles";

//array of campuses with default as SGW + .? optional chaining to avoid crash if null -> undefined instead
const campusList = [campuses.sgw, campuses.loyola].filter(Boolean);
const defaultCampusId = campuses.sgw?.id ?? campusList[0]?.id;

const MAROON = "#95223D";

const getAmenities = (building) => {
  const a = building?.amenities ?? {}; //empty when building is missing or amentites dont exist
  return {
    bathrooms: Boolean(a.bathrooms),
    waterFountains: Boolean(a.waterFountains),
    genderNeutralBathrooms: Boolean(a.genderNeutralBathrooms),
    wheelchairAccessible: Boolean(
      a.wheelchairAccessible ??
        a.wheelchairAccessibleEntrances ??
        a.wheelchairAccessibleEntrance
    ),
  };
};

export default function MapScreen({ route }) {
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Building info bottom sheet
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // outdoorPOI info
  const [isPOIPanelOpen, setIsPOIPanelOpen] = useState(false);
  const [pois, setPois] = useState([]);
  const [selectedPOICategory, setSelectedPOICategory] = useState("Coffee");
  const [poiFilterMode, setPOIFilterMode] = useState("nearest");
  const [poiRadius, setPOIRadius] = useState(1000);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [isPOILoading, setIsPOILoading] = useState(false);
  const [hasRequestedPOIs, setHasRequestedPOIs] = useState(false);
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
  const [travelMode, setTravelMode] = useState("walking");
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [followUser, setFollowUser] = useState(false);
  const [navActive, setNavActive] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [transitSubMode, setTransitSubMode] = useState("shuttle"); // shuttle | public
  const [isShuttleModalOpen, setIsShuttleModalOpen] = useState(false);
  const [transitRouteIndex, setTransitRouteIndex] = useState(0);
  const [isTransitCollapsed, setIsTransitCollapsed] = useState(false);
  const [mapRegion, setMapRegion] = useState(
    campuses.sgw?.region ?? campusList[0]?.region ?? null
  );

  const mapRef = useRef(null);
  const latestPOIRequestIdRef = useRef(0);
  const getPOIFetchRadius = (mode = poiFilterMode, radius = poiRadius) =>
    mode === "range" ? radius : Math.max(radius, 2000);

  //use memo -> hook that optimizes performance by caching the result of expensive calculations between re-renders
  const selectedCampus = useMemo(
    () => campusList.find((campus) => campus.id === selectedCampusId),
    [selectedCampusId] //checking the dependency array, if changed, it runs find again
  );

  // campuses other than the selected one
  const otherCampuses = useMemo(
    () => campusList.filter((c) => c.id !== selectedCampusId),
    [selectedCampusId]
  );

  //one array with both campuses + extra id
  const allBuildings = useMemo(
    () =>
      campusList.flatMap((campus) =>
        campus.buildings.map((building) => ({
          ...building,
          __campusId: campus.id,
        }))
      ),
    [] //runs once only
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
  const showCampusLabels = (mapRegion?.latitudeDelta ?? 0) > 0.02; //if false view is zoomed in -> building-level labels instead

  const openBuilding = (building) => {
    setShowDirectionsPanel(false);
    setSelectedBuilding(building);

    const center = getPolygonCenter(building.coordinates);
    if (center) {
      mapRef.current?.animateToRegion(
        { ...center, latitudeDelta: 0.003, longitudeDelta: 0.003 }, //zoom into building when selected 0.003 with 500 ms
        500
      );
    }
  };

  const handleBuildingPress = (building) => {
    setHasInteracted(true);
    const name = getBuildingName(building);
    const center = getPolygonCenter(building.coordinates);

    //Only fill if user explicitly selected a field first
    if (activeField === "start") {
      setStartText(name);
      if (center) setStartCoord(center);
      setStartCampusId(building.__campusId ?? selectedCampus?.id ?? null);
      setActiveField(null); //resetting to false so next tap doesn't also change start
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

  //read array from json
  const shuttleSchedules = useMemo(
    () => mapShuttleSchedules(shuttleSchedule),
    []
  );

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

  const isShuttleServiceActive = useMemo(
    () =>
      filteredShuttleSchedules.some(
        (schedule) => getShuttleDepartures(new Date(), schedule).active
      ),
    [filteredShuttleSchedules]
  );

  //picking a building from search results
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

  //selecting my location from search
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

  //autocomplete search if applicable
  const searchResults = useMemo(() => {
    if (!activeField) return [];
    const query = activeField === "start" ? startText : destText;
    const normalized = normalizeText(query);
    if (!normalized) return []; //no suggestions

    const startsWithMatches = [];
    const includesMatches = [];

    allBuildings.forEach((building) => {
      const fullName = normalizeText(building?.name || "");
      const shortName = normalizeText(building?.label || "");
      const startsWith =
        fullName.startsWith(normalized) || shortName.startsWith(normalized);
      const includes =
        fullName.includes(normalized) || shortName.includes(normalized);

      if (startsWith) {
        startsWithMatches.push(building);
      } else if (includes) {
        includesMatches.push(building);
      }
    });
    //return merged list with max 6 results
    return [...startsWithMatches, ...includesMatches].slice(0, 6);
  }, [activeField, startText, destText, allBuildings]);

  //decide whether to show the “My location” suggestion row
  const shouldShowMyLocationOption = useMemo(() => {
    if (!activeField) return false;
    const query = activeField === "start" ? startText : destText;
    const normalized = normalizeText(query);
    return normalized.startsWith("my");
  }, [activeField, startText, destText]);

  //building open and user selects “Directions”
  // Pre-fill destination from Calendar/Next Class and resolve to coords so directions run
  useEffect(() => {
    const location = route?.params?.nextClassLocation;
    const summary = route?.params?.nextClassSummary;
    if (!location) return;

    setDestText(location);
    setStartText("My location");
    setHasInteracted(true);
    setShowDirectionsPanel(true);
    if (userCoord) setStartCoord(userCoord);

    const code = String(location).trim().split(/\s+/)[0];
    if (code) {
      const building = allBuildings.find(
        (b) => (b.label || "").toUpperCase() === code.toUpperCase()
      );
      if (building) {
        const center = getPolygonCenter(building.coordinates);
        if (center) setDestCoord(center);
        setDestCampusId(building.__campusId ?? null);
      }
    }
  }, [route?.params, userCoord, allBuildings]);

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

  const {
    isCrossCampusTrip,
    directionsMode,
    shuttleRouting,
  } = useMapRoutingController({
    travelMode,
    transitSubMode,
    startCampusId,
    destCampusId,
    isShuttleServiceActive,
  });

  //swapping destinations
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

  // load nearby POIs based on category and radius
  const loadNearbyPOIs = async ({
    category = selectedPOICategory,
    radius = poiRadius,
  } = {}) => {
    setHasRequestedPOIs(true);
    if (!userCoord) return;

    const requestId = ++latestPOIRequestIdRef.current;
    setIsPOILoading(true);

    try {
    const results = await fetchNearbyPOIs({
      lat: userCoord.latitude,
      lng: userCoord.longitude,
      radius,
      type: categoryToType[category] ?? "cafe",
      origin: userCoord,
    });
      const normalizedResults = Array.isArray(results) ? results : [];

      if (requestId === latestPOIRequestIdRef.current) {
        setPois(normalizedResults);
      }
    } finally {
      if (requestId === latestPOIRequestIdRef.current) {
        setIsPOILoading(false);
      }
    }
  };

  const normalizedPOIs = useMemo(
    () =>
      (Array.isArray(pois) ? pois : []).filter(
        (poi) =>
          poi?.coords &&
          typeof poi.coords.latitude === "number" &&
          typeof poi.coords.longitude === "number" &&
          typeof poi?.name === "string" &&
          poi.name.trim().length > 0 &&
          typeof poi?.address === "string"
      ),
    [pois]
  );

  const displayedPOIs = useMemo(
    () => {
      if (normalizedPOIs.length === 0) return [];

      if (!userCoord) {
        return poiFilterMode === "nearest"
          ? normalizedPOIs.slice(0, 5)
          : normalizedPOIs;
      }

      return filterPOIsByMode({
        pois: normalizedPOIs,
        userCoord,
        mode: poiFilterMode,
        nearestCount: 5,
        radius: poiRadius,
      });
    },
    [normalizedPOIs, userCoord, poiFilterMode, poiRadius]
  );

  //when campus selection/toggle change this makes sure context is reset cleanly
  useEffect(() => {
    if (mapRef.current && selectedCampus) {
      setSelectedBuilding(null);
      setMapRegion(selectedCampus.region);
      mapRef.current.animateToRegion(selectedCampus.region, 600); //animate smoothly moves camera to target region
    }
  }, [selectedCampus]);

  // Track user location for "current building" highlight + blue dot continuously
  const { userCoord: liveUserCoord } = useUserLocation({ setHasLocationPerm });

  //Default Start = current location (only if Start is empty)
  useDefaultStartMyLocation({
    startText,
    setStartText,
    setHasLocationPerm,
    setStartCoord,
  });

  //fetch/prepare route data
  const {
    routeCoords: baseRouteCoords,
    routeInfo: baseRouteInfo,
    routeOptions,
  } = useDirectionsRoute({
    startCoord,
    destCoord,
    mapRef,
    mode: directionsMode,
    routeIndex: transitRouteIndex,
    fitToRoute: true,
  });

  //valid shuttle trip flow?
  const isActiveShuttleTrip = Boolean(
    shuttleRouting &&
      startCoord &&
      destCoord &&
      travelMode === "transit" &&
      transitSubMode === "shuttle"
  );

  //shuttle ride
  const { routeCoords: shuttleRideCoords, routeInfo: shuttleRideInfo } =
    useDirectionsRoute({
      startCoord: null,
      destCoord: null,
      mapRef: null,
      mode: isActiveShuttleTrip ? "driving" : null,
      originOverride: shuttleRouting?.originAddress ?? null, //Start/end come from shuttle stop coordinates from routing config
      destinationOverride: shuttleRouting?.destinationAddress ?? null,
      waypoints: shuttleRouting?.waypoints ?? null,
      fitToRoute: false,
    });

  //Compute walking route from user start point to departure shuttle stop
  const { routeCoords: walkToShuttleCoords } = useDirectionsRoute({
    startCoord,
    destCoord: null,
    mapRef: null,
    mode: isActiveShuttleTrip ? "walking" : null,
    originOverride: null,
    destinationOverride: shuttleRouting?.originAddress ?? null,
    waypoints: null,
    fitToRoute: false,
  });

  //Compute walking route from arrival shuttle stop to final destination
  const { routeCoords: walkFromShuttleCoords } = useDirectionsRoute({
    startCoord: null,
    destCoord,
    mapRef: null,
    mode: isActiveShuttleTrip ? "walking" : null,
    originOverride: shuttleRouting?.destinationAddress ?? null,
    destinationOverride: null,
    waypoints: null,
    fitToRoute: false,
  });

  const {
    routeCoords,
    routeInfo,
    strategyRouteOptions,
    safeRouteCoords,
    routeRenderMode,
    routeRideSegments,
    routeWalkDotCoords,
  } = useMapRoutingController({
    travelMode,
    transitSubMode,
    startCampusId,
    destCampusId,
    isShuttleServiceActive,
    routeInputs: {
      isActiveShuttleTrip,
      baseRouteCoords,
      baseRouteInfo,
      routeOptions,
      shuttleRideInfo,
      walkToShuttleCoords,
      shuttleRideCoords,
      walkFromShuttleCoords,
    },
  });

  const { isSimulating, simulatedCoord, stopSim, toggleSim } = useSimulation({
    routeCoords: safeRouteCoords,
    onStart: () => {
      setFollowUser(true);
      setHasLocationPerm(true);
    },
  });

  const userCoord =
    isSimulating && simulatedCoord ? simulatedCoord : liveUserCoord;

  // Resolve the building currently containing the effective user coordinate
  const { currentBuilding } = useCurrentBuilding({
    userCoord,
    allBuildings,
  });

  //detect campus when start is my location
  useEffect(() => {
    if (startText !== "My location") return;
    if (currentBuilding?.__campusId) {
      setStartCampusId(currentBuilding.__campusId);
    }
  }, [startText, currentBuilding]);

  const { currentStepIndex, setCurrentStepIndex } = useNavigationSteps({
    navActive,
    userCoord,
    routeInfo,
    speechEnabled,
  });

  const { handleGoPress, handleSimulatePress } = useMapRoutingActions({
    startCoord,
    destCoord,
    setFollowUser,
    setNavActive,
    setCurrentStepIndex,
    routeInfo,
    speechEnabled,
    speechApi: Speech,
    stripHtml,
    routeCoords,
    mapRef,
    userCoord,
    toggleSim,
  });

  const canShowDirectionsPanel = Boolean(
    showDirectionsPanel && startCoord && destCoord
  );

  const formatPOIDistance = (distance) => {
    if (typeof distance !== "number" || Number.isNaN(distance)) return "";
    if (distance < 1000) return `${Math.round(distance)}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const renderPOIContent = () => {
    if (isPOILoading) {
      return (
        <Text style={styles.poiStatusText}>Loading nearby places...</Text>
      );
    }

    if (displayedPOIs.length === 0) {
      return <Text style={styles.poiStatusText}>No nearby POIs found.</Text>;
    }

    return (
      <FlatList
        data={displayedPOIs}
        keyExtractor={(poi) => String(poi.id ?? poi.name)}
        renderItem={({ item: poi }) => (
          <Pressable
            onPress={() => setSelectedPOI(poi)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#FFFFFF",
              borderBottomWidth: 1,
              borderBottomColor: "#E9E9E9",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.poiResultTitle} numberOfLines={1}>
                {poi.name}
              </Text>
              {typeof poi.rating === "number" ? (
                <Text style={{ marginTop: 2, fontSize: 12, color: "#5C5C5C" }}>
                  {poi.rating.toFixed(1)} ★
                </Text>
              ) : null}
            </View>

            <Text style={{ fontSize: 12, fontWeight: "600", color: "#222" }}>
              {formatPOIDistance(poi.distance)}
            </Text>
          </Pressable>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    );
  };

  const isBottomPanelOpen = Boolean(selectedBuilding) || canShowDirectionsPanel;

  //Move recenter floating button upward when panel is open, so it doesn’t overlap the panel
  const recenterBottomOffset = isBottomPanelOpen ? 170 : 30;

  useMapRoutingSideEffects({
    routeState: {
      startCoord,
      destCoord,
      isSimulating,
      isCrossCampusTrip,
      travelMode,
      followUser,
    },
    routeSetters: {
      stopSim,
      setShowDirectionsPanel,
      setNavActive,
      setFollowUser,
      setCurrentStepIndex,
      setIsTransitCollapsed,
      setTravelMode,
    },
    mapState: {
      userCoord,
      mapRef,
    },
    shuttleState: {
      isActiveShuttleTrip,
      safeRouteCoords,
    },
  });

  useEffect(() => {
    if (!selectedPOI) return;
    setDestText(selectedPOI.name);
    setDestCoord(selectedPOI.coords);
    setDestCampusId(null);
  }, [selectedPOI]);

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
        <SearchBox
          styles={styles}
          startText={startText}
          destText={destText}
          activeField={activeField}
          searchResults={searchResults}
          shouldShowMyLocationOption={shouldShowMyLocationOption}
          getBuildingKey={getBuildingKey}
          getBuildingName={getBuildingName}
          onStartChange={(t) => {
            setHasInteracted(true);
            setStartText(t);
            // If they type random text, it no longer matches a known coordinate
            if (t !== "My location") setStartCoord(null);
            if (!t) setStartCampusId(null);
            if (!t) setShowDirectionsPanel(false);
          }}
          onDestChange={(t) => {
            setHasInteracted(true);
            setDestText(t);
            setDestCoord(null);
            if (!t) setDestCampusId(null);
            if (!t) setShowDirectionsPanel(false);
          }}
          onStartFocus={() => {
            setHasInteracted(true);
            setActiveField("start");
          }}
          onDestFocus={() => {
            setHasInteracted(true);
            setActiveField("dest");
          }}
          onClearStart={() => {
            setStartText("");
            setStartCoord(null);
          }}
          onClearDest={() => {
            setDestText("");
            setDestCoord(null);
          }}
          onSwap={handleSwapStartDest}
          onSelectMyLocation={selectMyLocationForField}
          onSelectBuilding={selectBuildingForField}
        />

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
          onRegionChangeComplete={(region) => setMapRegion(region)}
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

                {!showCampusLabels && center && label ? (
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

                  {!showCampusLabels && center && label ? (
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
            })
          )}

          {showCampusLabels &&
            campusList.map((campus) => (
              <Marker
                key={`campus-label-${campus.id}`}
                coordinate={{
                  latitude: campus.region.latitude,
                  longitude: campus.region.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                pointerEvents="none"
              >
                <View style={styles.campusLabel}>
                  <Text style={styles.campusLabelText}>
                    {campus.id === "sgw" ? "SGW" : "Loyola"}
                  </Text>
                </View>
              </Marker>
            ))}

          {displayedPOIs.map((poi) => (
            <Marker
              key={poi.id}
              coordinate={poi.coords}
              onPress={() => setSelectedPOI(poi)}
            >
              <View style={styles.poiMarker} />
            </Marker>
          ))}

        <RouteOverlay
          safeRouteCoords={safeRouteCoords}
          routeRenderMode={routeRenderMode}
          routeRideSegments={routeRideSegments}
          routeWalkDotCoords={routeWalkDotCoords}
        />
      </MapView>

      {selectedPOI && (
        <View
          style={[
            styles.poiInfoCardContainer,
            { bottom: isPOIPanelOpen ? 300 : 40 },
          ]}
        >
          <View style={styles.poiInfoCard}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={styles.poiInfoTitle} numberOfLines={1}>
                {selectedPOI.name}
              </Text>
              <Pressable onPress={() => setSelectedPOI(null)}>
                <MaterialIcons name="close" size={18} color="#1F1F1F" />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
              <View style={styles.poiInfoTag}>
                <Text style={styles.poiInfoTagText}>{selectedPOICategory}</Text>
              </View>
              <Text style={styles.poiInfoDistance}>
                {formatPOIDistance(selectedPOI.distance)}
              </Text>
            </View>

            <Text style={styles.poiInfoAddress} numberOfLines={2}>
              {selectedPOI.address}
            </Text>

            <Pressable
              style={styles.poiInfoCTA}
              onPress={() => {
                setDestCoord(selectedPOI.coords);
                setDestText(selectedPOI.name);
                setSelectedPOI(null);
              }}
            >
              <Text style={styles.poiInfoCTAText}>Get Directions</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Recenter Button - recenter on route start */}
      {hasLocationPerm && (routeCoords.length > 0 || userCoord) && (
        <Pressable
          testID="recenter-button"
          style={[styles.recenterBtn, { bottom: recenterBottomOffset }]}
            onPress={() => {
              const targetCoord =
                routeCoords.length > 0 ? routeCoords[0] : userCoord;
              if (targetCoord) {
                mapRef.current?.animateToRegion(
                  {
                    latitude: targetCoord.latitude,
                    longitude: targetCoord.longitude,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                  },
                  500
                );
              }
            }}
          >
            <MaterialIcons name="my-location" size={24} color={MAROON} />
          </Pressable>
        )}

        {/* Bottom sheet */}
        <BuildingBottomSheet
          styles={styles}
          maroon={MAROON}
          selectedBuilding={selectedBuilding}
          getBuildingName={getBuildingName}
          getAmenities={getAmenities}
          onClose={() => setSelectedBuilding(null)}
          onDirections={setDestinationToSelectedBuilding}
        />

        {isPOIPanelOpen && (
          <View
            testID="poi-panel"
            style={
              hasRequestedPOIs
                ? [
                    styles.poiPanel,
                    {
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      width: "100%",
                      backgroundColor: "#FFFFFF",
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                      padding: 16,
                      maxHeight: "40%",
                      justifyContent: "flex-start",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: -2 },
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                      elevation: 8,
                    },
                  ]
                : styles.poiPanel
            }
          >
            <View style={styles.poiPanelHeader}>
              <Text style={styles.poiPanelTitle}>Outdoor POIs</Text>
              <Pressable onPress={() => setIsPOIPanelOpen(false)}>
                <MaterialIcons name="close" size={20} color="#1F1F1F" />
              </Pressable>
            </View>

            {!hasRequestedPOIs ? (
              <>
                <Text style={styles.poiPanelSectionLabel}>Find nearby</Text>

                <View style={styles.poiCategoryRow}>
                  {["nearest", "range"].map((mode) => {
                    const isSelected = poiFilterMode === mode;
                    return (
                      <Pressable
                        key={mode}
                        onPress={() => setPOIFilterMode(mode)}
                        style={[
                          styles.poiCategoryChip,
                          isSelected && styles.poiCategoryChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.poiCategoryChipText,
                            isSelected && styles.poiCategoryChipTextActive,
                          ]}
                        >
                          {mode === "nearest" ? "Nearest" : "Range"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.poiPanelSectionLabel}>
                  {poiFilterMode === "nearest"
                    ? "Show nearest"
                    : "Range (meters)"}
                </Text>

                {poiFilterMode === "range" ? (
                  <View style={styles.poiRadiusRow}>
                    <Pressable
                      onPress={() => {
                        const nextRadius = Math.max(100, poiRadius - 100);
                        setPOIRadius(nextRadius);
                      }}
                      style={styles.poiRadiusButton}
                    >
                      <Text style={styles.poiRadiusButtonText}>-</Text>
                    </Pressable>

                    <View style={styles.poiRadiusValueBox}>
                      <Text style={styles.poiRadiusValueText}>{poiRadius}</Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        const nextRadius = poiRadius + 100;
                        setPOIRadius(nextRadius);
                      }}
                      style={styles.poiRadiusButton}
                    >
                      <Text style={styles.poiRadiusButtonText}>+</Text>
                    </Pressable>
                  </View>
                ) : null}

                <Text style={styles.poiPanelSectionLabel}>Category</Text>

                <View style={styles.poiCategoryRow}>
                  {Object.keys(categoryToType).map((category) => {
                    const isSelected = selectedPOICategory === category;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => setSelectedPOICategory(category)}
                        style={[
                          styles.poiCategoryChip,
                          isSelected && styles.poiCategoryChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.poiCategoryChipText,
                            isSelected && styles.poiCategoryChipTextActive,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  onPress={() =>
                    loadNearbyPOIs({
                      category: selectedPOICategory,
                      radius: getPOIFetchRadius(poiFilterMode, poiRadius),
                    })
                  }
                  style={{
                    backgroundColor: MAROON,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 12,
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    Show on map
                  </Text>
                </Pressable>
              </>
            ) : (
              <View
                style={{
                  marginTop: 8,
                  overflow: "hidden",
                  flex: 1,
                }}
              >
                {renderPOIContent()}
              </View>
            )}
          </View>
        )}

        {/* POI Button */}
        <Pressable
          testID="poi-button"
          onPress={() => {
            setHasRequestedPOIs(false);
            setIsPOIPanelOpen(true);
          }}
          style={[styles.poiButton, isPOIPanelOpen && styles.poiButtonActive]}
        >
          <MaterialIcons name="info" size={44} style={styles.poiButtonIcon} />
        </Pressable>

        {canShowDirectionsPanel && (
          <DirectionsPanel
            styles={styles}
            maroon={MAROON}
            travelMode={travelMode}
            setTravelMode={setTravelMode}
            isCrossCampusTrip={Boolean(isCrossCampusTrip)}
            transitSubMode={transitSubMode}
            setTransitSubMode={setTransitSubMode}
            setIsShuttleModalOpen={setIsShuttleModalOpen}
            isTransitCollapsed={isTransitCollapsed}
            setIsTransitCollapsed={setIsTransitCollapsed}
            routeOptions={strategyRouteOptions}
            transitRouteIndex={transitRouteIndex}
            setTransitRouteIndex={setTransitRouteIndex}
            routeInfo={routeInfo}
            stripHtml={stripHtml}
            speechEnabled={speechEnabled}
            onToggleSpeech={() => {
              setSpeechEnabled((prev) => !prev);
              Speech.stop();
            }}
            isSimulating={isSimulating}
            onSimulate={handleSimulatePress}
            onGo={handleGoPress}
          />
        )}
      </View>

      <ShuttleModal
        styles={styles}
        isOpen={isShuttleModalOpen}
        onClose={() => setIsShuttleModalOpen(false)}
        filteredShuttleSchedules={filteredShuttleSchedules}
        getShuttleDepartures={getShuttleDepartures}
      />
    </View>
  );
}
