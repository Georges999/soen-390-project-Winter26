import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Polygon } from 'react-native-maps';

import CampusToggle from '../components/CampusToggle';
import campuses from '../data/campuses.json';

const campusList = [campuses.sgw, campuses.loyola].filter(Boolean);
const defaultCampusId = campuses.sgw?.id ?? campusList[0]?.id;

const getPolygonCenter = (points = []) => {
  if (!points.length) {
    return null;
  }

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
  const mapRef = useRef(null);

  const selectedCampus = useMemo(
    () => campusList.find((campus) => campus.id === selectedCampusId),
    [selectedCampusId]
  );

  useEffect(() => {
    if (mapRef.current && selectedCampus) {
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
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Campus</Text>
        <Text style={styles.subtitle}>Choose a cammpus to explore buildings and get directions</Text>
      </View>

      <CampusToggle
        campuses={campusList}
        selectedId={selectedCampusId}
        onSelect={setSelectedCampusId}
      />

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
      >
        {selectedCampus.buildings.map((building) => {
          const center = getPolygonCenter(building.coordinates);

          return (
            <React.Fragment key={building.id}>
              <Polygon
                coordinates={building.coordinates}
                fillColor={building.fillColor ?? 'rgba(145, 35, 56, 0.35)'}
                strokeColor={building.strokeColor ?? '#912338'}
                strokeWidth={2}
                tappable
              />
              {center && building.label ? (
                <Marker coordinate={center} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.labelBubble}>
                    <Text style={styles.labelText}>{building.label}</Text>
                  </View>
                </Marker>
              ) : null}
            </React.Fragment>
          );
        })}
      </MapView>

      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#912338',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#666',
  },
  map: {
    flex: 1,
  },
  labelBubble: {
    backgroundColor: 'rgba(63, 63, 63, 0.83)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  labelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666',
  },
});
