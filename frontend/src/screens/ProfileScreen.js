import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  authenticateWithGoogle,
  disconnectCalendar,
  isAuthenticated,
} from '../services/googleCalendarAuth';
import {
  fetchGoogleCalendars,
  saveSelectedCalendarIds,
} from '../services/googleCalendarService';

const MAROON = '#95223D';

export default function ProfileScreen({ navigation }) {
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    const authenticated = await isAuthenticated();
    setIsConnected(authenticated);

    if (authenticated) {
      await loadCalendars();
    } else {
      setCalendars([]);
    }
  }

  async function loadCalendars() {
    const result = await fetchGoogleCalendars();

    if (result.success) {
      setCalendars(result.calendars);
      return result.calendars;
    }

    setCalendars([]);
    return [];
  }

  async function handleConnect() {
    setIsLoading(true);

    try {
      const result = await authenticateWithGoogle();

      if (!result.success) {
        Alert.alert('Connection Failed', result.error || 'Could not connect calendar');
        return;
      }

      const connectedCalendars = await loadCalendars();
      setIsConnected(true);

      if (connectedCalendars.length > 0) {
        Alert.alert('Calendar Connected', 'Google Calendar connected successfully');
      } else {
        Alert.alert(
          'Calendar Connected',
          'Google Calendar connected, but no calendars were returned for this account.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect() {
    setIsLoading(true);

    try {
      await disconnectCalendar();
      setIsConnected(false);
      setCalendars([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleCalendar(calendarId) {
    const updatedCalendars = calendars.map((cal) =>
      cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal
    );

    setCalendars(updatedCalendars);
    await saveSelectedCalendarIds(
      updatedCalendars.filter((calendar) => calendar.selected).map((calendar) => calendar.id)
    );
  }

  function handleViewCalendar() {
    navigation.navigate('Calendar', {
      selectedCalendarIds: calendars
        .filter((calendar) => calendar.selected)
        .map((calendar) => calendar.id),
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>My Schedule</Text>

        <View style={styles.connectCard}>
          <View style={styles.connectIcon}>
            <MaterialIcons name="event" size={32} color="#FFF" />
            <View style={styles.dateBox}>
              <Text style={styles.dateNumber}>31</Text>
            </View>
          </View>
          <View style={styles.connectText}>
            <Text style={styles.connectTitle}>
              {isConnected ? 'Google Calendar Connected' : 'Connect Google Calendar'}
            </Text>
            <Text style={styles.connectSubtitle}>
              {isConnected ? 'Syncing Your Class' : 'Sync Your Class'}
            </Text>
          </View>
          <Pressable
            style={styles.connectButton}
            onPress={isConnected ? handleDisconnect : handleConnect}
            disabled={isLoading}
          >
            <Text style={styles.connectButtonText}>
              {isLoading ? 'Loading...' : isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </Pressable>
        </View>

        {isConnected && (
          <>
            <Text style={styles.sectionTitle}>Connected Calendars</Text>

            {calendars.length === 0 ? (
              <Text style={styles.emptyCalendarsText}>No Google calendars found.</Text>
            ) : (
              calendars.map((calendar) => (
                <Pressable
                  key={calendar.id}
                  style={styles.calendarItem}
                  onPress={() => toggleCalendar(calendar.id)}
                >
                  <View style={[styles.checkbox, calendar.selected && styles.checkboxSelected]}>
                    {calendar.selected && (
                      <MaterialIcons name="check" size={16} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.calendarName}>{calendar.name}</Text>
                </Pressable>
              ))
            )}

            <Pressable style={styles.viewCalendarButton} onPress={handleViewCalendar}>
              <Text style={styles.viewCalendarText}>View Calendar</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: MAROON,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
  },
  connectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: MAROON,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  connectIcon: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dateBox: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#FFF',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dateNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: MAROON,
  },
  connectText: {
    flex: 1,
    marginLeft: 16,
  },
  connectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
  },
  connectSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  connectButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: MAROON,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: MAROON,
    borderColor: MAROON,
  },
  calendarName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  emptyCalendarsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  viewCalendarButton: {
    backgroundColor: MAROON,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  viewCalendarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
