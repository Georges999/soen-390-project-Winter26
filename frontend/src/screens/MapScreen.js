import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
import PropTypes from "prop-types";
import { View, Text, Pressable, Keyboard } from "react-native";
import MapView from "react-native-maps";
import * as Speech from "expo-speech";

import CampusToggle from "../components/CampusToggle";
import SearchBox from "../components/SearchBox";
import BuildingBottomSheet from "../components/BuildingBottomSheet";
import DirectionsPanel from "../components/DirectionsPanel";
import ShuttleModal from "../components/ShuttleModal";
import RouteOverlay from "../components/RouteOverlay";
import MapHeaderControls from "../components/MapScreen/MapHeaderControls";
import POIInfoCard from "../components/MapScreen/POIInfoCard";
import POIListPanel from "../components/MapScreen/POIListPanel";
import RecenterButton from "../components/MapScreen/RecenterButton";
import IndoorHandoffPanel from "../components/MapScreen/IndoorHandoffPanel";
import POIButton from "../components/MapScreen/POIButton";
import BuildingOverlays from "../components/MapScreen/BuildingOverlays";
import campuses from "../data/campuses.json";
import shuttleSchedule from "../data/shuttleSchedule.json";
import { buildAllRooms, getFilteredRooms } from "../utils/indoorMapUtils";
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
const ROOM_BUILDING_SEARCH_ALIASES = {
  hall: ["h", "hall building", "henry f hall building"],
  mb: ["mb", "john molson building"],
  cc: ["cc", "central building"],
  vl: ["vl", "vanier library", "vanier library building"],
  ve: ["ve", "vanier extension"],
};

export const getPoiApiRadius = (fetchRadius, mode, radius) => {
  if (typeof fetchRadius === "number" && Number.isFinite(fetchRadius)) {
    return fetchRadius;
  }
  if (mode === "range") {
    return radius;
  }
  return Math.max(radius, 2000);
};

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

export const handleGoLogic = ({
  startCoord,
  startText,
  userCoord,
  destCoord,
  routeInfo,
  speechEnabled,
  routeCoords,
  mapRef,
  Speech,
  stripHtml,
  setFollowUser,
  setNavActive,
  setCurrentStepIndex,
}) => {
  const effectiveStart =
    startCoord ?? (startText && startText !== "" ? null : userCoord);

  if (!effectiveStart || !destCoord) return;

  setFollowUser(true);
  setNavActive(true);
  setCurrentStepIndex(0);

  const firstInstruction = routeInfo?.steps?.[0]?.instruction;
  if (firstInstruction && speechEnabled) {
    Speech?.stop?.();
    Speech?.speak?.(stripHtml(firstInstruction));
  }

  if (routeCoords.length > 1) {
    fitMapToRoute(mapRef, routeCoords);
  } else if (effectiveStart) {
    zoomMapToCoordinate(mapRef, effectiveStart);
  }
};

export const handlePoiInfoCtaLogic = ({
  startText,
  userCoord,
  selectedPOI,
  setHasInteracted,
  setStartText,
  setStartCoord,
  setStartCampusId,
  setDestCoord,
  setDestText,
  setDestCampusId,
  setShowDirectionsPanel,
  setSelectedPOI,
}) => {
  // Prefill directions: only default origin to device location
  // if the user has not entered a custom origin.
  if (!startText) {
    setHasInteracted(true);
    setStartText("My location");
    if (userCoord) setStartCoord(userCoord);
    setStartCampusId(null);
  }

  setDestCoord(selectedPOI.coords);
  setDestText(selectedPOI.name);
  setDestCampusId(null);

  // Open the directions panel and dismiss the POI card so
  // both are never visible together.
  setShowDirectionsPanel(true);
  setSelectedPOI(null);
};

export const getPoiInfoCardBottomOffset = (isPOIPanelOpen) =>
  isPOIPanelOpen ? 300 : 40;

export const handleRecenterPressLogic = ({
  routeCoords,
  userCoord,
  mapRef,
}) => {
  const targetCoord = routeCoords.length > 0 ? routeCoords[0] : userCoord;
  if (targetCoord) {
    zoomMapToCoordinate(mapRef, targetCoord);
  }
};

const setLooseDestinationAndOpenPanel = ({
  location,
  setDestText,
  setDestCoord,
  setDestCampusId,
  openDirectionsPanel,
}) => {
  setDestText(location);
  setDestCoord(null);
  setDestCampusId(null);
  openDirectionsPanel();
};

const applyNextClassPrefill = ({
  location,
  allBuildings,
  setDestinationAndOpenPanel,
  setDestText,
  setDestCoord,
  setDestCampusId,
  openDirectionsPanel,
}) => {
  const code = String(location).trim().split(/\s+/)[0];
  if (!code) {
    setLooseDestinationAndOpenPanel({
      location,
      setDestText,
      setDestCoord,
      setDestCampusId,
      openDirectionsPanel,
    });
    return;
  }

  const building = allBuildings.find(
    (b) => (b.label || "").toUpperCase() === code.toUpperCase(),
  );
  if (building) {
    const center = getPolygonCenter(building.coordinates);
    setDestinationAndOpenPanel(location, center, building.__campusId ?? null);
    return;
  }

  setLooseDestinationAndOpenPanel({
    location,
    setDestText,
    setDestCoord,
    setDestCampusId,
    openDirectionsPanel,
  });
};

const formatPOIDistance = (distance) => {
  if (typeof distance !== "number" || Number.isNaN(distance)) return "";
  if (distance < 1000) return `${Math.round(distance)}m`;
  return `${(distance / 1000).toFixed(1)}km`;
};

const useSyncStartCampusFromCurrentBuilding = ({
  startText,
  currentBuilding,
  setStartCampusId,
}) => {
  useEffect(() => {
    if (startText !== "My location") return;
    if (currentBuilding?.__campusId) {
      setStartCampusId(currentBuilding.__campusId);
    }
  }, [startText, currentBuilding, setStartCampusId]);
};

const useSyncDestinationFromSelectedPOI = ({
  selectedPOI,
  setShowDirectionsPanel,
  setDestinationDetails,
  setDestIndoorRoom,
}) => {
  useEffect(() => {
    if (!selectedPOI) return;
    // When a POI card is shown, hide the bottom directions panel so
    // the two are never visible at the same time.
    setShowDirectionsPanel(false);
    setDestinationDetails(selectedPOI.name, selectedPOI.coords, null);
    setDestIndoorRoom(null);
  }, [
    selectedPOI,
    setShowDirectionsPanel,
    setDestinationDetails,
    setDestIndoorRoom,
  ]);
};

const zoomMapToCoordinate = (mapRef, coord) => {
  mapRef.current?.animateToRegion(
    { ...coord, latitudeDelta: 0.003, longitudeDelta: 0.003 },
    500,
  );
};

const fitMapToRoute = (mapRef, routeCoords) => {
  mapRef.current?.fitToCoordinates(routeCoords, {
    edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
    animated: true,
  });
};

export default function MapScreen({ route, navigation }) {
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Building info bottom sheet
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // outdoorPOI info
  const [isPOIPanelOpen, setIsPOIPanelOpen] = useState(false);
  const [pois, setPois] = useState([]);
  const [selectedPOI, setSelectedPOI] = useState(null);
  /** Snapshot from last "Show on map" - list filtering must not use live filter form chip state. */
  const [poiDisplayFilters, setPoiDisplayFilters] = useState({
    mode: "nearest",
    radius: 1000,
  });
  const [lastPoiCategory, setLastPoiCategory] = useState("Coffee");
  const [isPOILoading, setIsPOILoading] = useState(false);
  const [hasRequestedPOIs, setHasRequestedPOIs] = useState(false);
  const [poiSearchOrigin, setPoiSearchOrigin] = useState(null);
  // Start/Destination inputs
  const [activeField, setActiveField] = useState(null);
  const [startText, setStartText] = useState("");
  const [destText, setDestText] = useState("");
  const [startIndoorRoom, setStartIndoorRoom] = useState(null);
  const [destIndoorRoom, setDestIndoorRoom] = useState(null);
  const [hasLocationPerm, setHasLocationPerm] = useState(false);
  const [startCampusId, setStartCampusId] = useState(null);
  const [destCampusId, setDestCampusId] = useState(null);

  // coords for directions
  const [startCoord, setStartCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  const [travelMode, setTravelMode] = useState("driving");
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
  const latestPOIRequestIdRef = useRef(0);
  /** Restore directions panel after closing POI sheet if it was visible when POI opened. */
  const directionsVisibleBeforePoiRef = useRef(false);
  const setLocationDetails = (
    setText,
    setCoord,
    setCampusId,
    text,
    coords,
    campusId,
  ) => {
    setText(text);
    if (coords) setCoord(coords);
    if (campusId !== undefined) setCampusId(campusId);
  };

  const clearLocationDetails = (setText, setCoord, setCampusId) => {
    setText("");
    setCoord(null);
    setCampusId(null);
  };

  const setOriginDetails = (text, coords, campusId) => {
    setLocationDetails(
      setStartText,
      setStartCoord,
      setStartCampusId,
      text,
      coords,
      campusId,
    );
  };

  const setDestinationDetails = (text, coords, campusId) => {
    setLocationDetails(
      setDestText,
      setDestCoord,
      setDestCampusId,
      text,
      coords,
      campusId,
    );
  };

  const setOriginToUserLocation = (coords) => {
    setHasInteracted(true);
    setOriginDetails("My location", coords, null);
  };

  const clearOriginDetails = () => {
    clearLocationDetails(setStartText, setStartCoord, setStartCampusId);
    setStartIndoorRoom(null);
  };

  const clearDestinationDetails = () => {
    clearLocationDetails(setDestText, setDestCoord, setDestCampusId);
    setDestIndoorRoom(null);
  };

  const openDirectionsPanel = () => {
    setShowDirectionsPanel(true);
  };

  const setDestinationAndOpenPanel = (text, coords, campusId) => {
    setDestinationDetails(text, coords, campusId);
    openDirectionsPanel();
  };

  const handleLocationTextChange = ({
    value,
    setText,
    setCoord,
    clearDetails,
    clearRoomSelection,
    preserveMyLocation = false,
  }) => {
    setHasInteracted(true);
    if (!value) {
      clearDetails();
      setShowDirectionsPanel(false);
      return;
    }

    setText(value);
    clearRoomSelection?.();
    if (setCoord && (!preserveMyLocation || value !== "My location")) {
      setCoord(null);
    }
  };

  const handleStartTextChange = (t) => {
    handleLocationTextChange({
      value: t,
      setText: setStartText,
      setCoord: setStartCoord,
      clearDetails: clearOriginDetails,
      clearRoomSelection: () => setStartIndoorRoom(null),
      preserveMyLocation: true,
    });
  };

  const handleDestTextChange = (t) => {
    handleLocationTextChange({
      value: t,
      setText: setDestText,
      setCoord: setDestCoord,
      clearDetails: clearDestinationDetails,
      clearRoomSelection: () => setDestIndoorRoom(null),
    });
  };

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
  const allRooms = useMemo(() => buildAllRooms(), []);

  const getBuildingName = (b) => b?.name || b?.label || "Building";
  const getBuildingKey = (campusId, b) =>
    `${campusId}:${b?.id ?? b?.name ?? b?.label ?? "unknown"}`;
  const getRoomKey = (room) =>
    `${room?.campusId ?? "unknown"}:${room?.buildingId ?? "unknown"}:${room?.id ?? room?.label ?? "room"}`;
  const getRoomLabel = (room) => {
    if (!room) return "Room";
    return room.buildingName
      ? `${room.label} · ${room.buildingName}`
      : room.label || "Room";
  };
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
      zoomMapToCoordinate(mapRef, center); //zoom into building when selected 0.003 with 500 ms
    }
  };

  const handleBuildingPress = (building) => {
    setHasInteracted(true);
    const name = getBuildingName(building);
    const center = getPolygonCenter(building.coordinates);

    //Only fill if user explicitly selected a field first
    if (activeField === "start") {
      setOriginDetails(
        name,
        center,
        building.__campusId ?? selectedCampus?.id ?? null,
      );
      setStartIndoorRoom(null);
      setActiveField(null); //resetting to false so next tap doesn't also change start
      Keyboard.dismiss();
      return;
    }

    if (activeField === "dest") {
      setDestinationDetails(
        name,
        center,
        building.__campusId ?? selectedCampus?.id ?? null,
      );
      setDestIndoorRoom(null);
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
      setOriginDetails(name, center, building.__campusId ?? null);
      setStartIndoorRoom(null);
    } else if (field === "dest") {
      setDestinationDetails(name, center, building.__campusId ?? null);
      setDestIndoorRoom(null);
    }

    setActiveField(null);
    Keyboard.dismiss();
  };

  const selectRoomForField = (room, field) => {
    const buildingAliases =
      ROOM_BUILDING_SEARCH_ALIASES[room?.buildingId] ?? [];
    const normalizedAliases = new Set(
      buildingAliases.map((alias) => normalizeText(alias)),
    );
    const matchedBuilding =
      allBuildings.find(
        (building) =>
          building.id === room?.buildingId &&
          building.__campusId === room?.campusId,
      ) ??
      allBuildings.find(
        (building) =>
          building.__campusId === room?.campusId &&
          normalizedAliases.has(normalizeText(building.label || "")),
      ) ??
      allBuildings.find(
        (building) =>
          building.__campusId === room?.campusId &&
          normalizedAliases.has(normalizeText(building.name || "")),
      ) ??
      allBuildings.find((building) => building.id === room?.buildingId);
    const center = matchedBuilding
      ? getPolygonCenter(matchedBuilding.coordinates)
      : null;

    if (!matchedBuilding || !center) return;

    const label = getRoomLabel(room);

    if (field === "start") {
      setOriginDetails(label, center, matchedBuilding.__campusId ?? null);
      setStartIndoorRoom(room);
    } else if (field === "dest") {
      setDestinationDetails(label, center, matchedBuilding.__campusId ?? null);
      setDestIndoorRoom(room);
    }

    setActiveField(null);
    Keyboard.dismiss();
  };

  //selecting my location from search
  const selectMyLocationForField = async (field) => {
    const coords = await getUserCoords();
    if (!coords) return;

    if (field === "start") {
      setOriginToUserLocation(coords);
      setStartIndoorRoom(null);
    } else if (field === "dest") {
      setDestinationDetails("My location", coords, null);
      setDestIndoorRoom(null);
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

  const roomResults = useMemo(() => {
    if (!activeField) return [];

    const query = activeField === "start" ? startText : destText;
    const normalizedQuery = String(query)
      .toUpperCase()
      .replaceAll(/[^A-Z0-9]/g, "");
    if (normalizedQuery.length < 2) return [];

    return getFilteredRooms(allRooms, query, {
      preferredCampusId: selectedCampusId,
    });
  }, [activeField, startText, destText, allRooms, selectedCampusId]);

  //decide whether to show the “My location” suggestion row
  const shouldShowMyLocationOption = useMemo(() => {
    if (!activeField) return false;
    const query = activeField === "start" ? startText : destText;
    const normalized = normalizeText(query);
    return normalized.startsWith("my");
  }, [activeField, startText, destText]);

  // Pre-fill outdoor route when navigating from indoor cross-building directions
  useEffect(() => {
    const outdoor = route?.params?.outdoorRoute;
    if (!outdoor) return;

    setStartText(outdoor.startName || "");
    setDestText(outdoor.destName || "");
    setStartIndoorRoom(null);
    setDestIndoorRoom(null);
    setHasInteracted(true);
    setShowDirectionsPanel(true);

    setStartCoord(outdoor.startCoords ?? null);
    setDestCoord(outdoor.destCoords ?? null);
  }, [route?.params?.outdoorRoute]);

  // Pre-fill from Calendar/Next Class when params change (not on every GPS tick)
  useEffect(() => {
    const location = route?.params?.nextClassLocation;
    const summary = route?.params?.nextClassSummary;
    if (!location || summary == null || summary === "") return;

    setHasInteracted(true);
    setStartText("My location");
    setStartCampusId(null);
    setStartCoord(userCoord ?? null);
    setStartIndoorRoom(null);
    setDestIndoorRoom(null);

    applyNextClassPrefill({
      location,
      allBuildings,
      setDestinationAndOpenPanel,
      setDestText,
      setDestCoord,
      setDestCampusId,
      openDirectionsPanel,
    });
  }, [
    route?.params?.nextClassLocation,
    route?.params?.nextClassSummary,
    allBuildings,
  ]);

  // Auto-switch to driving mode for cross-campus or cross-building routes
  useEffect(() => {
    if (startCampusId && destCampusId && startCampusId !== destCampusId) {
      setTravelMode("driving");
    }
  }, [startCampusId, destCampusId]);

  const setDestinationToSelectedBuilding = () => {
    if (!selectedBuilding) return;

    const name = getBuildingName(selectedBuilding);
    const center = getPolygonCenter(selectedBuilding.coordinates);

    setDestinationAndOpenPanel(
      name,
      center,
      selectedBuilding.__campusId ?? selectedCampus?.id ?? null,
    );
    setDestIndoorRoom(null);

    setSelectedBuilding(null);
    Keyboard.dismiss();
  };

  const { isCrossCampusTrip, directionsMode, shuttleRouting } =
    useMapRoutingController({
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
    const nextStartIndoorRoom = destIndoorRoom;
    const nextDestIndoorRoom = startIndoorRoom;

    setStartText(nextStartText);
    setDestText(nextDestText);
    setStartCoord(nextStartCoord);
    setDestCoord(nextDestCoord);
    setStartCampusId(nextStartCampusId);
    setDestCampusId(nextDestCampusId);
    setStartIndoorRoom(nextStartIndoorRoom);
    setDestIndoorRoom(nextDestIndoorRoom);
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

  const userCoord =
    isSimulating && simulatedCoord ? simulatedCoord : liveUserCoord;

  // If Map opened before GPS was ready, set start once when location arrives
  useEffect(() => {
    if (!route?.params?.nextClassLocation) return;
    if (startText !== "My location") return;
    if (!userCoord) return;
    setStartCoord((prev) => prev ?? userCoord);
  }, [userCoord, route?.params?.nextClassLocation, startText]);

  const normalizedPOIs = useMemo(
    () =>
      (Array.isArray(pois) ? pois : []).filter(
        (poi) =>
          poi?.coords &&
          typeof poi.coords.latitude === "number" &&
          typeof poi.coords.longitude === "number" &&
          typeof poi?.name === "string" &&
          poi.name.trim().length > 0 &&
          typeof poi?.address === "string",
      ),
    [pois],
  );

  const displayedPOIs = useMemo(() => {
    if (normalizedPOIs.length === 0) return [];

    // Use the POI search origin (the coordinate used when fetching the
    // current `pois`) when available, otherwise fall back to the live
    // `userCoord`. This prevents live location updates from changing
    // the ordering and resetting the POI list scroll position.
    const orderingOrigin = poiSearchOrigin ?? userCoord;

    /* istanbul ignore next -- defensive fallback when no ordering origin is available */
    if (!orderingOrigin) {
      return poiDisplayFilters.mode === "nearest"
        ? normalizedPOIs.slice(0, 5)
        : normalizedPOIs;
    }

    return filterPOIsByMode({
      pois: normalizedPOIs,
      userCoord: orderingOrigin,
      mode: poiDisplayFilters.mode,
      nearestCount: 5,
      radius: poiDisplayFilters.radius,
    });
  }, [normalizedPOIs, userCoord, poiSearchOrigin, poiDisplayFilters]);

  // load nearby POIs based on category and radius (after userCoord exists)
  const loadNearbyPOIs = useCallback(
    async ({
      category = "Coffee",
      mode = "nearest",
      radius = 1000,
      fetchRadius,
    } = {}) => {
      const poiOriginCoord =
        (startText && startText !== "My location" && startCoord) ||
        (destText && destText !== "My location" && destCoord) ||
        userCoord;

      if (!poiOriginCoord) return;

      setPoiDisplayFilters({ mode, radius });
      setLastPoiCategory(category);
      setHasRequestedPOIs(true);
      setPoiSearchOrigin(poiOriginCoord);

      const requestId = ++latestPOIRequestIdRef.current;
      setIsPOILoading(true);

      const apiRadius = getPoiApiRadius(fetchRadius, mode, radius);

      try {
        const results = await fetchNearbyPOIs({
          lat: poiOriginCoord.latitude,
          lng: poiOriginCoord.longitude,
          radius: apiRadius,
          type: categoryToType[category] ?? "cafe",
          origin: poiOriginCoord,
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
    },
    [startText, startCoord, destText, destCoord, userCoord],
  );

  // Resolve the building currently containing the effective user coordinate
  const { currentBuilding } = useCurrentBuilding({
    userCoord,
    allBuildings,
  });

  useSyncStartCampusFromCurrentBuilding({
    startText,
    currentBuilding,
    setStartCampusId,
  });

  const { setCurrentStepIndex } = useNavigationSteps({
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
    showDirectionsPanel && startCoord && destCoord && !selectedPOI,
  );
  const shouldShowIndoorHandoff = Boolean(
    (startIndoorRoom || destIndoorRoom) && !activeField,
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

  useSyncDestinationFromSelectedPOI({
    selectedPOI,
    setShowDirectionsPanel,
    setDestinationDetails,
    setDestIndoorRoom,
  });

  //Without this comment,we'd need to write a unit test specifically to force a missing config scenario to achieve 100% test coverage
  /* istanbul ignore next -- defensive guard if campus config is invalid/missing */
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
      <MapHeaderControls
        hasInteracted={hasInteracted}
        currentBuilding={currentBuilding}
        getBuildingName={getBuildingName}
        styles={styles}
      />

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
          startText={startText}
          destText={destText}
          activeField={activeField}
          searchResults={searchResults}
          roomResults={roomResults}
          shouldShowMyLocationOption={shouldShowMyLocationOption}
          getBuildingKey={getBuildingKey}
          getBuildingName={getBuildingName}
          getRoomKey={getRoomKey}
          getRoomLabel={getRoomLabel}
          onStartChange={handleStartTextChange}
          onDestChange={handleDestTextChange}
          onStartFocus={() => {
            setHasInteracted(true);
            setActiveField("start");
          }}
          onDestFocus={() => {
            setHasInteracted(true);
            setActiveField("dest");
          }}
          onClearStart={clearOriginDetails}
          onClearDest={clearDestinationDetails}
          onSwap={handleSwapStartDest}
          onSelectMyLocation={selectMyLocationForField}
          onSelectBuilding={selectBuildingForField}
          onSelectRoom={selectRoomForField}
        />

        <IndoorHandoffPanel
          isVisible={shouldShowIndoorHandoff}
          onPress={() => {
            navigation?.navigate?.("Indoor", {
              screen: "IndoorDirections",
              params: {
                ...(startIndoorRoom ? { startRoom: startIndoorRoom } : {}),
                ...(destIndoorRoom ? { destinationRoom: destIndoorRoom } : {}),
              },
            });
          }}
          styles={styles}
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
          removeClippedSubviews={false}
          onPress={() => setActiveField(null)}
          onRegionChangeComplete={(region) => setMapRegion(region)}
        >
          <BuildingOverlays
            selectedCampus={selectedCampus}
            otherCampuses={otherCampuses}
            showCampusLabels={showCampusLabels}
            campusList={campusList}
            isCurrentBuilding={isCurrentBuilding}
            displayedPOIs={displayedPOIs}
            onBuildingPress={handleBuildingPress}
            onPoiPress={(poi) => {
              setSelectedPOI(poi);
              setIsPOIPanelOpen(false);
              setHasRequestedPOIs(true);
            }}
            styles={styles}
          />

          <RouteOverlay
            safeRouteCoords={safeRouteCoords}
            routeRenderMode={routeRenderMode}
            routeRideSegments={routeRideSegments}
            routeWalkDotCoords={routeWalkDotCoords}
          />
        </MapView>

        <POIInfoCard
          poi={selectedPOI}
          lastPoiCategory={lastPoiCategory}
          poiDistance={formatPOIDistance(selectedPOI?.distance)}
          isPanelOpen={isPOIPanelOpen}
          onClose={() => setSelectedPOI(null)}
          onGetDirections={() => {
            handlePoiInfoCtaLogic({
              startText,
              userCoord,
              selectedPOI,
              setHasInteracted,
              setStartText,
              setStartCoord,
              setStartCampusId,
              setDestCoord,
              setDestText,
              setDestCampusId,
              setShowDirectionsPanel,
              setSelectedPOI,
            });
          }}
          getPoiInfoCardBottomOffset={getPoiInfoCardBottomOffset}
          styles={styles}
        />

        {/* Recenter Button - recenter on route start */}
        <RecenterButton
          isVisible={hasLocationPerm && (routeCoords.length > 0 || userCoord)}
          bottomOffset={recenterBottomOffset}
          onPress={() => {
            handleRecenterPressLogic({ routeCoords, userCoord, mapRef });
          }}
          styles={styles}
        />

        {/* Bottom sheet */}
        <BuildingBottomSheet
          selectedBuilding={selectedBuilding}
          getBuildingName={getBuildingName}
          getAmenities={getAmenities}
          onClose={() => setSelectedBuilding(null)}
          onDirections={setDestinationToSelectedBuilding}
        />

        <POIListPanel
          isOpen={isPOIPanelOpen}
          hasRequested={hasRequestedPOIs}
          isLoading={isPOILoading}
          pois={displayedPOIs.map((poi) => ({
            ...poi,
            formattedDistance: formatPOIDistance(poi.distance),
          }))}
          onClose={() => {
            setIsPOIPanelOpen(false);
            if (
              directionsVisibleBeforePoiRef.current &&
              startCoord &&
              destCoord &&
              !selectedPOI
            ) {
              setShowDirectionsPanel(true);
            }
            directionsVisibleBeforePoiRef.current = false;
          }}
          onPoiSelect={(poi) => {
            setSelectedPOI(poi);
            setIsPOIPanelOpen(false);
          }}
          onShowOnMap={loadNearbyPOIs}
          styles={styles}
          maroonColor={MAROON}
        />

        {/* POI Button */}
        <POIButton
          isOpen={isPOIPanelOpen}
          isClearFilterPanel={!hasRequestedPOIs}
          onPress={() => {
            directionsVisibleBeforePoiRef.current = Boolean(
              showDirectionsPanel && startCoord && destCoord && !selectedPOI,
            );
            if (directionsVisibleBeforePoiRef.current) {
              setShowDirectionsPanel(false);
            }
            setSelectedPOI(null);
            setHasRequestedPOIs(false);
            setIsPOIPanelOpen(true);
          }}
          styles={styles}
        />

        {canShowDirectionsPanel && (
          <DirectionsPanel
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

MapScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func,
  }),
  route: PropTypes.shape({
    params: PropTypes.shape({
      outdoorRoute: PropTypes.shape({
        startName: PropTypes.string,
        destName: PropTypes.string,
        startCoords: PropTypes.object,
        destCoords: PropTypes.object,
      }),
      nextClassLocation: PropTypes.string,
      nextClassSummary: PropTypes.string,
    }),
  }),
};
