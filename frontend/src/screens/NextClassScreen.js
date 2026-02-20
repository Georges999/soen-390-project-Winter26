import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';
import campuses from '../data/campuses.json';
import mockCalendars from '../data/mockCalendars.json';

const MAROON = '#95223D';
const campusList = [campuses.sgw, campuses.loyola].filter(Boolean);

function getByDay(recurrenceString) {
  const match = recurrenceString.match(/BYDAY=([A-Z,]+)/);
  if (!match) return [];
  return match[1].split(',');
}

function getNextClass(calendars) {
  const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const now = new Date();
  const todayCode = dayMap[now.getDay()];

  const selectedCalendars = calendars.filter(c => c.selected);
  const events = selectedCalendars.flatMap(c => c.events || []);

  const todayEvents = events.filter(event => {
    const byDays = getByDay(event.recurrence?.[0] || '');
    return byDays.includes(todayCode);
  });

  const upcoming = todayEvents
    .map(event => {
      const eventDate = new Date(event.start.dateTime);
      const classTime = new Date();
      classTime.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);
      return { ...event, classTime };
    })
    .filter(event => event.classTime > now)
    .sort((a, b) => a.classTime - b.classTime);

  return upcoming[0] || null;
}

export default function NextClassScreen({ navigation }) {
  const [calendars] = useState(mockCalendars.calendars);
  const [showDetected, setShowDetected] = useState(false);
  const nextClass = getNextClass(calendars);

  function getMinutesUntil(event) {
    const eventDate = new Date(event.start.dateTime);
    const classTime = new Date();
    classTime.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);
    return Math.floor((classTime - new Date()) / 1000 / 60);
  }

  function handleGetDirections() {
    navigation.navigate('Map', {
      nextClassLocation: nextClass?.location,
      nextClassSummary: nextClass?.summary,
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
        {campusList.map(campus =>
          campus.buildings.map(building => (
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
            <MaterialIcons name="event-busy" size={40} color="#CCC" />
            <Text style={styles.noClassTitle}>No upcoming classes today</Text>
            <Text style={styles.noClassSubtitle}>
              Check your calendar for upcoming classes
            </Text>
            <Pressable
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileButtonText}>View Schedule</Text>
            </Pressable>
          </View>
        ) : !showDetected ? (
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
              <Text style={styles.courseName}>{nextClass.summary}</Text>
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
