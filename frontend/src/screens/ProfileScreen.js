import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  authenticateWithGoogle,
  disconnectCalendar,
  isAuthenticated,
} from '../services/googleCalendarAuth';
import mockCalendars from '../data/mockCalendars.json';

const MAROON = '#95223D';

export default function ProfileScreen({ navigation }) {
  const [isConnected, setIsConnected] = useState(false);
  const [calendars, setCalendars] = useState(mockCalendars.calendars);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    const authenticated = await isAuthenticated();
    setIsConnected(authenticated);
  }

  async function handleConnect() {
    const result = await authenticateWithGoogle();
    if (result.success) {
      setIsConnected(true);
    }
  }

  async function handleDisconnect() {
    await disconnectCalendar();
    setIsConnected(false);
  }

  function toggleCalendar(calendarId) {
    setCalendars((prev) =>
      prev.map((cal) =>
        cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal
      )
    );
  }

  function handleViewCalendar() {
    navigation.navigate('Calendar');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>My Schedule</Text>

        <Pressable
          style={styles.connectCard}
          onPress={isConnected ? handleDisconnect : handleConnect}
        >
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
          <Pressable style={styles.connectButton}>
            <Text style={styles.connectButtonText}>
              {isConnected ? 'Disconnect' : 'Connect'}
            </Text>
          </Pressable>
        </Pressable>

        {isConnected && (
          <>
            <Text style={styles.sectionTitle}>Connected Calendars</Text>

            {calendars.map((calendar) => (
              <View key={calendar.id} style={styles.calendarItem}>
                <Switch
                  value={calendar.selected}
                  onValueChange={() => toggleCalendar(calendar.id)}
                  trackColor={{ false: '#E0E0E0', true: MAROON }}
                  thumbColor="#FFF"
                />
                <Text style={styles.calendarName}>{calendar.name}</Text>
              </View>
            ))}

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
  calendarName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
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
