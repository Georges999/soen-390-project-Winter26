import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import campuses from '../data/campuses.json';
import { isAuthenticated } from '../services/googleCalendarAuth';
import { useNextClass } from '../hooks/useNextClass';

const MAROON = '#95223D';
const campusList = [campuses.sgw, campuses.loyola].filter(Boolean);

export default function NextClassScreen({ navigation }) {
  const [isConnected, setIsConnected] = useState(false);
  const [showDetected, setShowDetected] = useState(false);
  const { nextClass, isLoading, refresh } = useNextClass(isConnected);

  useEffect(() => {
    refreshConnectionState();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      refreshConnectionState();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!nextClass) {
      setShowDetected(false);
    }
  }, [nextClass]);

  async function refreshConnectionState() {
    const authenticated = await isAuthenticated();
    setIsConnected(authenticated);

    if (authenticated) {
      await refresh();
    }
  }

  const shouldShowDetected = showDetected && nextClass !== null;
  let noClassSubtitle = 'Connect Google Calendar from Profile to see your next class';
  if (isLoading) {
    noClassSubtitle = 'Loading your Google Calendar';
  } else if (isConnected) {
    noClassSubtitle = 'No upcoming classes found in your selected Google calendars';
  }

  function getMinutesUntil(event) {
    const startTime = event.startTime || event.start?.dateTime;
    const mins = Math.floor((new Date(startTime).getTime() - Date.now()) / 1000 / 60);
    return Math.max(0, mins);
  }

  function handleGetDirections() {
    navigation.navigate('Map', {
      nextClassLocation: nextClass?.location,
      nextClassSummary: nextClass?.summary || nextClass?.title,
    });
  }

  function handleGoToNextClass() {
    setShowDetected(true);
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={campuses.sgw?.region}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {campusList.map((campus) =>
          campus.buildings.map((building) => (
            <Polygon
              key={`${campus.id}-${building.id}`}
              coordinates={building.coordinates}
              fillColor="rgba(149, 34, 61, 0.4)"
              strokeColor={MAROON}
              strokeWidth={1}
            />
          ))
        )}
      </MapView>

      <View style={styles.bottomCard}>
        {!nextClass ? (
          <View style={styles.noClassCard}>
            <MaterialIcons name={isLoading ? 'schedule' : 'event-busy'} size={40} color="#CCC" />
            <Text style={styles.noClassTitle}>No upcoming classes today</Text>
            <Text style={styles.noClassSubtitle}>{noClassSubtitle}</Text>
            <Pressable
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileButtonText}>View Schedule</Text>
            </Pressable>
          </View>
        ) : !shouldShowDetected ? (
          <Pressable style={styles.goToClassCard} onPress={handleGoToNextClass}>
            <MaterialIcons name="event-note" size={32} color={MAROON} />
            <View style={styles.goToClassText}>
              <Text style={styles.goToClassTitle}>Go to My Next Class</Text>
              <Text style={styles.goToClassSubtitle}>Based on your schedule</Text>
            </View>
            <MaterialIcons name="chevron-right" size={28} color={MAROON} />
          </Pressable>
        ) : (
          <View style={styles.nextClassCard}>
            <View style={styles.detectedRow}>
              <MaterialIcons name="check-box" size={24} color={MAROON} />
              <Text style={styles.detectedText}>Next Class Detected</Text>
            </View>

            <View style={styles.classInfoRow}>
              <Text style={styles.courseName}>{nextClass.summary || nextClass.title}</Text>
              <View style={styles.dot} />
              <Text style={styles.roomCode}>{nextClass.location}</Text>
            </View>

            <View style={styles.timeRow}>
              <Text style={styles.startsIn}>
                Starts in{' '}
                <Text style={styles.minutesText}>
                  {getMinutesUntil(nextClass)} min
                </Text>
              </Text>
              <Pressable
                style={styles.directionsButton}
                onPress={handleGetDirections}
              >
                <Text style={styles.directionsText}>Get Directions</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  map: {
    flex: 1,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  noClassCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  goToClassCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  goToClassText: {
    flex: 1,
  },
  goToClassTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  goToClassSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  noClassTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
  },
  noClassSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  profileButton: {
    backgroundColor: MAROON,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  profileButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  nextClassCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  detectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detectedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  classInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    color: MAROON,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#333',
  },
  roomCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  startsIn: {
    fontSize: 14,
    color: '#333',
  },
  minutesText: {
    color: MAROON,
    fontWeight: '700',
  },
  directionsButton: {
    backgroundColor: MAROON,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  directionsText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

NextClassScreen.propTypes = {
  navigation: PropTypes.shape({
    addListener: PropTypes.func,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};
