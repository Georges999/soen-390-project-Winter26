import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Keyboard,
} from "react-native";
import MapView, { Polygon, Polyline, Marker, Circle } from "react-native-maps";
import { MaterialIcons } from "@expo/vector-icons";
import * as Speech from "expo-speech";

import CampusToggle from "../components/CampusToggle";
import CalendarButton from "../components/CalendarButton";
import NextClassCard from "../components/NextClassCard";
import SearchBox from "../components/SearchBox";
import BuildingBottomSheet from "../components/BuildingBottomSheet";
import DirectionsPanel from "../components/DirectionsPanel";
import ShuttleModal from "../components/ShuttleModal";
import campuses from "../data/campuses.json";
import shuttleSchedule from "../data/shuttleSchedule.json";

import { useDefaultStartMyLocation } from "../hooks/useDefaultStartMyLocation";
import { useDirectionsRoute } from "../hooks/useDirectionsRoute";
import { useNextClass } from "../hooks/useNextClass";
import { findBuildingUserIsIn } from "../utils/geo";
import {
  buildDotCoords,
  distanceMeters,
  getPolygonCenter,
} from "../utils/geoUtils";
import { normalizeText, stripHtml } from "../utils/textUtils";
import {
  getShuttleDepartures,
  mapShuttleSchedules,
} from "../utils/shuttleUtils";
import { getUserCoords, watchUserCoords } from "../services/locationService";

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0); //step i'm currently on for voice
  const [isSimulating, setIsSimulating] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [transitSubMode, setTransitSubMode] = useState("shuttle"); // shuttle | public
  const [isShuttleModalOpen, setIsShuttleModalOpen] = useState(false);
  const [transitRouteIndex, setTransitRouteIndex] = useState(0);
  const [isTransitCollapsed, setIsTransitCollapsed] = useState(false);
  const [mapRegion, setMapRegion] = useState(
    campuses.sgw?.region ?? campusList[0]?.region ?? null,
  );
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);

  //Unlike state, changing a ref's value does not trigger a re-render of the component -> efficient for storing transient data
  const simTimerRef = useRef(null);
  const simIndexRef = useRef(0);
  const simActiveRef = useRef(false);

  const mapRef = useRef(null);

  const { nextClass, buildingCode } = useNextClass(isCalendarConnected);

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

  const handleNavigateToNextClass = () => {
    if (!buildingCode) return;

    const building = allBuildings.find(
      (b) => b.label?.toUpperCase() === buildingCode.toUpperCase()
    );

    if (building) {
      // Set start to "My location"
      setStartText('My location');
      if (userCoord) {
        setStartCoord(userCoord);
      }
      
      // Set destination to class building
      setDestText(getBuildingName(building));
      const center = getPolygonCenter(building.coordinates);
      if (center) setDestCoord(center);
      setDestCampusId(building.__campusId ?? selectedCampus?.id ?? null);
      setHasInteracted(true);
    }
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

  const stopSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsSimulating(false);
  };

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
    setCurrentStepIndex(0); //resets navigation to the first instruction step
    const firstInstruction = routeInfo?.steps?.[0]?.instruction;
    if (firstInstruction && speechEnabled) {
      Speech.stop();
      Speech.speak(stripHtml(firstInstruction));
    }
    //adjusts map camera for navigation if route path exists
    if (routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
    }
    //if route has no usable polyline, center map on user location.
    else if (userCoord) {
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
    setUserCoord(routeCoords[0]); //Put simulated user at first route point

    //move to next route point every sec
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

  const shuttleStopCoordByCampus = useMemo(() => {
    return {
      // SGW shuttle stop on De Maisonneuve side
      sgw: "45.496820,-73.578760",
      // Loyola stop on Sherbrooke Street
      loyola: "45.458360,-73.638150",
    };
  }, []);

  const shuttleRouting = useMemo(
    () => {
      if (
        travelMode !== "transit" ||
        transitSubMode !== "shuttle" ||
        !isCrossCampusTrip ||
        !isShuttleServiceActive
      ) {
        return null;
      }

      const originAddress = shuttleStopCoordByCampus[startCampusId];
      const destinationAddress = shuttleStopCoordByCampus[destCampusId];
      if (!originAddress || !destinationAddress) return null;

      return {
        originAddress,
        destinationAddress,
        waypoints: [],
      };
    },
    //Recompute shuttle routing using memo when any of these following inputs changes
    [
      travelMode,
      transitSubMode,
      isCrossCampusTrip,
      isShuttleServiceActive,
      startCampusId,
      destCampusId,
      shuttleStopCoordByCampus,
    ],
  );

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

  //Track user location for "current building" highlight + blue dot continuously
  useEffect(() => {
    let cancelled = false;
    let subscription = null; //holds location watcher object

    //Call watchUserCoords to subscribe to position updates
    (async () => {
      try {
        const sub = await watchUserCoords((coords) => {
          if (cancelled) return;
          if (simActiveRef.current) return; //ignored if simulation is running
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

  //when is sumlating is tiggered location updates don’t override it
  useEffect(() => {
    simActiveRef.current = isSimulating;
  }, [isSimulating]);

  //whenever user loc changes
  useEffect(() => {
    if (!userCoord) {
      setCurrentBuilding(null);
      return;
    }

    const found = findBuildingUserIsIn(userCoord, allBuildings);
    setCurrentBuilding(found ?? null);
  }, [userCoord, allBuildings]);

  //detect campus when start is my location
  useEffect(() => {
    if (startText !== "My location") return;
    if (currentBuilding?.__campusId) {
      setStartCampusId(currentBuilding.__campusId);
    }
  }, [startText, currentBuilding]);

  //Default Start = current location (only if Start is empty)
  useDefaultStartMyLocation({
    startText,
    setStartText,
    setHasLocationPerm,
    setStartCoord,
  });

  //Route to send to google directions API
  const directionsMode =
    travelMode === "transit"
      ? transitSubMode === "public"
        ? "transit"
        : null //null is sent if shuttle
      : travelMode;

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

  //connecting 3 shuttle segments together
  const snappedShuttleSegments = useMemo(() => {
    if (!isActiveShuttleTrip) {
      return {
        walkTo: Array.isArray(walkToShuttleCoords) ? walkToShuttleCoords : [],
        ride: Array.isArray(shuttleRideCoords) ? shuttleRideCoords : [],
        walkFrom: Array.isArray(walkFromShuttleCoords)
          ? walkFromShuttleCoords
          : [],
      };
    }

    const walkTo = Array.isArray(walkToShuttleCoords)
      ? [...walkToShuttleCoords]
      : [];
    const ride = Array.isArray(shuttleRideCoords) ? [...shuttleRideCoords] : [];
    const walkFrom = Array.isArray(walkFromShuttleCoords)
      ? [...walkFromShuttleCoords]
      : [];

    //boundaries -> End of walk-to is forced to equal start of ride & Start of walk-from is forced to equal end of ride
    if (walkTo.length > 0 && ride.length > 0) {
      walkTo[walkTo.length - 1] = ride[0];
    }
    if (walkFrom.length > 0 && ride.length > 0) {
      walkFrom[0] = ride[ride.length - 1];
    }

    return { walkTo, ride, walkFrom };
  }, [
    isActiveShuttleTrip,
    walkToShuttleCoords,
    shuttleRideCoords,
    walkFromShuttleCoords,
  ]);

  //one final shuttle route polyline by combining 3 segments
  const shuttleCompositeCoords = useMemo(() => {
    if (!isActiveShuttleTrip) return [];
    const chunks = [
      snappedShuttleSegments.walkTo,
      snappedShuttleSegments.ride,
      snappedShuttleSegments.walkFrom,
    ].filter((c) => Array.isArray(c) && c.length > 0);
    if (chunks.length === 0) return [];

    const merged = [];
    chunks.forEach((chunk) => {
      chunk.forEach((point) => {
        const prev = merged[merged.length - 1];
        //Skip duplicate boundary points -> If new point equals last added point, skip it
        if (
          prev &&
          prev.latitude === point.latitude &&
          prev.longitude === point.longitude
        ) {
          return;
        }
        merged.push(point);
      });
    });
    return merged;
  }, [isActiveShuttleTrip, snappedShuttleSegments]);

  //creates many small points every ~3 meters along that segment
  const shuttleWalkDotCoords = useMemo(() => {
    if (!isActiveShuttleTrip) return [];
    return [
      ...buildDotCoords(snappedShuttleSegments.walkTo, 3),
      ...buildDotCoords(snappedShuttleSegments.walkFrom, 3),
    ];
  }, [isActiveShuttleTrip, snappedShuttleSegments]);

  //prepare shuttle ride data in the format expected by render code
  const shuttleRideSegments = useMemo(() => {
    if (!isActiveShuttleTrip) return [];
    return Array.isArray(snappedShuttleSegments.ride) &&
      snappedShuttleSegments.ride.length > 1
      ? [snappedShuttleSegments.ride] //wrap it in another array if valid
      : [];
  }, [isActiveShuttleTrip, snappedShuttleSegments]);

  const routeCoords = isActiveShuttleTrip
    ? shuttleCompositeCoords
    : baseRouteCoords;
  const routeInfo = isActiveShuttleTrip ? shuttleRideInfo : baseRouteInfo;
  const safeRouteCoords = Array.isArray(routeCoords) ? routeCoords : [];

  //auto-zoom map to the full shuttle route when shuttle route becomes available
  useEffect(() => {
    if (!isActiveShuttleTrip || safeRouteCoords.length < 2) return;
    mapRef.current?.fitToCoordinates(safeRouteCoords, {
      edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
      animated: true,
    });
  }, [isActiveShuttleTrip, safeRouteCoords]);

  const walkingDotCoords = useMemo(() => {
    if (travelMode !== "walking") return [];
    return buildDotCoords(safeRouteCoords, 3);
  }, [travelMode, safeRouteCoords]);

  const transitWalkingDotCoords = useMemo(() => {
    if (travelMode !== "transit") return [];
    const steps = Array.isArray(routeInfo?.steps) ? routeInfo.steps : [];

    return steps
      .filter(
        (step) =>
          String(step?.travelMode || "").toUpperCase() === "WALKING" &&
          Array.isArray(step?.coords) &&
          step.coords.length > 1,
      )
      .flatMap((step) => buildDotCoords(step.coords, 3)); //For each walking step -> generate dot points every 3m
  }, [travelMode, routeInfo]);

  const transitRideSegments = useMemo(() => {
    if (travelMode !== "transit") return [];
    const steps = Array.isArray(routeInfo?.steps) ? routeInfo.steps : [];

    return steps
      .filter(
        (step) =>
          String(step?.travelMode || "").toUpperCase() !== "WALKING" &&
          Array.isArray(step?.coords) &&
          step.coords.length > 1,
      )
      .map((step) => step.coords);
  }, [travelMode, routeInfo]);

  const canShowDirectionsPanel = Boolean(
    showDirectionsPanel && startCoord && destCoord,
  );

  const isBottomPanelOpen = Boolean(selectedBuilding) || canShowDirectionsPanel;

  //Move recenter floating button upward when panel is open, so it doesn’t overlap the panel
  const recenterBottomOffset = isBottomPanelOpen ? 170 : 30;

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

  //when user starts simulation, transit details auto-hide to free map space
  useEffect(() => {
    if (isSimulating) {
      setIsTransitCollapsed(true);
    }
  }, [isSimulating]);

  //walking in one campus
  useEffect(() => {
    if (!isCrossCampusTrip && travelMode === "transit") {
      setTravelMode("walking");
    }
  }, [isCrossCampusTrip, travelMode]);

  //as user location updates, map keeps centering on them
  useEffect(() => {
    if (!followUser || !userCoord) return;
    mapRef.current?.animateToRegion(
      { ...userCoord, latitudeDelta: 0.003, longitudeDelta: 0.003 },
      500,
    );
  }, [followUser, userCoord]);

  //advance turn-by-turn guidance to the next step when user gets close enough to current step endpoint
  useEffect(() => {
    if (!navActive || !userCoord || !routeInfo?.steps?.length) return;
    const currentStep = routeInfo.steps[currentStepIndex];
    if (!currentStep?.endLocation) return;

    const meters = distanceMeters(userCoord, currentStep.endLocation);
    if (meters > 25) return; //if user is farther than 25m from end of current step stay on same step

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

      <View style={styles.calendarButtonContainer}>
        <CalendarButton onConnectionChange={(connected) => {
          setIsCalendarConnected(connected);
          if (connected) {
            setHasInteracted(true);
          }
        }} />
      </View>

      {isCalendarConnected && nextClass && (
        <NextClassCard
          nextClass={nextClass}
          buildingCode={buildingCode}
          onNavigate={handleNavigateToNextClass}
        />
      )}

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

          {/* Recenter Button - recenter on route start */}
          {hasLocationPerm && (routeCoords.length > 0 || userCoord) && (
            <Pressable
              style={[styles.recenterBtn, { bottom: recenterBottomOffset }]}
              onPress={() => {
                // Use first point of route if available, otherwise user location
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

          {/* Draw the path */}
          {safeRouteCoords.length > 0 &&
            (travelMode === "walking" ? (
              <>
                <Polyline
                  testID="route-polyline"
                  coordinates={safeRouteCoords}
                  strokeWidth={6}
                  strokeColor="rgba(37, 99, 235, 0.15)"
                />
                {walkingDotCoords.map((dot, idx) => (
                  <Circle
                    key={`walk-dot-${idx}`}
                    center={dot}
                    radius={1}
                    fillColor="#2563eb"
                    strokeColor="#2563eb"
                    strokeWidth={1}
                  />
                ))}
              </>
            ) : (
              <>
                {isActiveShuttleTrip ? (
                  <>
                    {shuttleRideSegments.map((segment, idx) => (
                      <Polyline
                        key={`shuttle-ride-${idx}`}
                        testID={idx === 0 ? "route-polyline" : undefined}
                        coordinates={segment}
                        strokeWidth={5}
                        strokeColor="#2563eb"
                      />
                    ))}
                    {shuttleWalkDotCoords.map((dot, idx) => (
                      <Circle
                        key={`shuttle-walk-dot-${idx}`}
                        center={dot}
                        radius={1}
                        fillColor="#2563eb"
                        strokeColor="#2563eb"
                        strokeWidth={1}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {(() => {
                      const isMixedMode = travelMode === "transit";
                      const hasSegmentData =
                        transitRideSegments.length > 0 ||
                        transitWalkingDotCoords.length > 0;

                      if (isMixedMode && hasSegmentData) {
                        return (
                          <>
                            {transitRideSegments.map((segment, idx) => (
                              <Polyline
                                key={`transit-ride-${idx}`}
                                testID={
                                  idx === 0 ? "route-polyline" : undefined
                                }
                                coordinates={segment}
                                strokeWidth={5}
                                strokeColor="#2563eb"
                              />
                            ))}
                            {transitWalkingDotCoords.map((dot, idx) => (
                              <Circle
                                key={`transit-walk-dot-${idx}`}
                                center={dot}
                                radius={1}
                                fillColor="#2563eb"
                                strokeColor="#2563eb"
                                strokeWidth={1}
                              />
                            ))}
                          </>
                        );
                      }

                      return (
                        <Polyline
                          testID="route-polyline"
                          coordinates={safeRouteCoords}
                          strokeWidth={5}
                          strokeColor="#2563eb"
                        />
                      );
                    })()}
                  </>
                )}
              </>
            ))}
        </MapView>

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
            routeOptions={routeOptions}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "#fff",
  },
  calendarButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
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
  campusLabel: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(149, 34, 61, 0.35)",
  },
  campusLabelText: {
    fontSize: 13,
    fontWeight: "900",
    color: MAROON,
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
  recenterBtn: {
    position: "absolute",
    left: 16,
    bottom: 80,
    backgroundColor: "#fff",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
