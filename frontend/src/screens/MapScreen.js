import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Keyboard } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';

import CampusToggle from '../components/CampusToggle';
import campuses from '../data/campuses.json';

const campusList = [campuses.sgw, campuses.loyola].filter(Boolean);
const defaultCampusId = campuses.sgw?.id ?? campusList[0]?.id;

const MAROON = '#912338';

const getPolygonCenter = (points = []) => {
  if (!points.length) return null;

  const totals = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 }
  );

  return {
    latitude: totals.latitude / points.length,
    longitude: totals.longitude / points.length,
  };
};

export default function MapScreen() {
  const [selectedCampusId, setSelectedCampusId] = useState(defaultCampusId);

  // Building info bottom sheet
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  // Start/Destination inputs
  const [activeField, setActiveField] = useState(null); // null | 'start' | 'dest'
  const [startText, setStartText] = useState('');
  const [destText, setDestText] = useState('');

  const mapRef = useRef(null);

  const selectedCampus = useMemo(
    () => campusList.find((campus) => campus.id === selectedCampusId),
    [selectedCampusId]
  );

  const getBuildingName = (b) => b?.name || b?.label || 'Building';

  const openBuilding = (building) => {
    setSelectedBuilding(building);

    const center = getPolygonCenter(building.coordinates);
    if (center) {
      mapRef.current?.animateToRegion(
        { ...center, latitudeDelta: 0.003, longitudeDelta: 0.003 },
        500
      );
    }
  };

  const handleBuildingPress = (building) => {
    const name = getBuildingName(building);

    // Only fill if user explicitly selected a field first
    if (activeField === 'start') {
      setStartText(name);
      setActiveField(null);
      Keyboard.dismiss();
      return;
    }

    if (activeField === 'dest') {
      setDestText(name);
      setActiveField(null);
      Keyboard.dismiss();
      return;
    }

    // Otherwise, normal behavior: show building info
    openBuilding(building);
  };

  useEffect(() => {
    if (mapRef.current && selectedCampus) {
      setSelectedBuilding(null);
      mapRef.current.animateToRegion(selectedCampus.region, 600);
    }
  }, [selectedCampus]);

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
        <Text style={styles.title}>Select Your Campus</Text>
        <Text style={styles.subtitle}>
          Choose a campus to explore buildings and get directions
        </Text>
      </View>

      <CampusToggle
        campuses={campusList}
        selectedId={selectedCampusId}
        onSelect={setSelectedCampusId}
      />

      {/* Wrapper so overlays can sit above map */}
      <View style={{ flex: 1 }}>
        {/* red input box: Start + Destination */}
        <View style={styles.redBox}>
          <View style={styles.inputRow}>
            <TextInput
              value={startText}
              onChangeText={setStartText}
              placeholder="Start"
              placeholderTextColor="#EED7DE"
              style={styles.input}
              onFocus={() => setActiveField('start')}
            />
          </View>

          <View style={[styles.inputRow, { marginBottom: 0 }]}>
            <TextInput
              value={destText}
              onChangeText={setDestText}
              placeholder="Destination"
              placeholderTextColor="#EED7DE"
              style={styles.input}
              onFocus={() => setActiveField('dest')}
            />
          </View>
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
          showsUserLocation
          showsCompass
          showsScale
          // Tap empty map 
          onPress={() => setActiveField(null)}
        >
          {selectedCampus.buildings.map((building) => (
            <Polygon
              key={building.id}
              coordinates={building.coordinates}
              fillColor="rgba(145, 35, 56, 0.25)"
              strokeColor="rgba(145, 35, 56, 0.9)"
              strokeWidth={2}
              tappable
              onPress={() => handleBuildingPress(building)}
            />
          ))}
        </MapView>

        {/* Bottom sheet (building info) */}
        {selectedBuilding && (
          <View style={styles.sheetWrap} pointerEvents="box-none">
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeaderRow}>
                <View style={styles.sheetHeaderLeft}>
                  <View style={styles.buildingIcon}>
                    <Text style={styles.buildingIconText}>C</Text>
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
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  title: { fontSize: 26, fontWeight: '700', color: MAROON },
  subtitle: { marginTop: 4, fontSize: 15, color: '#666' },

  map: { flex: 1 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#666' },

  // Red box (start/destination)
  redBox: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: MAROON,
    borderRadius: 22,
    padding: 12,
  },
  inputRow: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  input: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },

  // Bottom sheet
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E6E6E6',
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  buildingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MAROON,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildingIconText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  buildingTitle: { fontSize: 16, fontWeight: '800', color: '#111', letterSpacing: 0.4 },
  buildingSub: { marginTop: 4, fontSize: 13, color: '#666', lineHeight: 18 },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 16, color: '#333', fontWeight: '700' },
});