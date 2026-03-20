import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Keyboard,
} from "react-native";
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
      a.wheelchairAccessibleEntrance,
    ),
  };
};

export default function MapScreen({ route }) {
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Building info bottom sheet
  const [selectedBuilding, setSelectedBuilding] = useState(null);

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
    campuses.sgw?.region ?? campusList[0]?.region ?? null,
  );

  const mapRef = useRef(null);

  //use memo -> hook that optimizes performance by caching the result of expensive calculations between re-renders
  const selectedCampus = useMemo(
    () => campusList.find((campus) => campus.id === selectedCampusId),
    [selectedCampusId], //checking the dependency array, if changed, it runs find again
  );

  // campuses other than the selected one
  const otherCampuses = useMemo(
    () => campusList.filter((c) => c.id !== selectedCampusId),
    [selectedCampusId],
  );

  //one array with both campuses + extra id
  const allBuildings = useMemo(
    () =>
      campusList.flatMap((campus) =>
        campus.buildings.map((building) => ({
          ...building,
          __campusId: campus.id,
        })),
      ),
    [], //runs once only
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
        500,
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
    [],
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
        (schedule) => getShuttleDepartures(new Date(), schedule).active,
      ),
    [filteredShuttleSchedules],
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
    transitSubMode === "shuttle",
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

  const userCoord = isSimulating && simulatedCoord ? simulatedCoord : liveUserCoord;

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
    showDirectionsPanel && startCoord && destCoord,
  );

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
            }),
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

          <RouteOverlay
            safeRouteCoords={safeRouteCoords}
            routeRenderMode={routeRenderMode}
            routeRideSegments={routeRideSegments}
            routeWalkDotCoords={routeWalkDotCoords}
          />
        </MapView>

        {/* Recenter Button - recenter on route start */}
        {hasLocationPerm && (routeCoords.length > 0 || userCoord) && (
          <Pressable
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
                  500,
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
