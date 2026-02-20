import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import mockCalendars from '../data/mockCalendars.json';

const MAROON = '#95223D';

function getByDay(recurrenceString) {
  const match = recurrenceString.match(/BYDAY=([A-Z,]+)/);
  if (!match) return [];
  return match[1].split(',');
}

function getWeekDays(referenceDate) {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function CalendarScreen({ navigation, route }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const weekDays = getWeekDays(selectedDate);

  // Accept calendars from ProfileScreen or fall back to JSON
  const calendarState = route?.params?.calendars || mockCalendars.calendars;
  const selectedCalendars = calendarState.filter(cal => cal.selected);
  const events = selectedCalendars.flatMap(cal => cal.events || []);

  const dayOfWeek = selectedDate.getDay();
  const dayMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  const selectedDayCode = dayMap[dayOfWeek];

  const todaysClasses = events.filter(event => {
    const recurrence = event.recurrence?.[0] || '';
    const byDays = getByDay(recurrence);
    return byDays.includes(selectedDayCode);
  }).sort((a, b) =>
    new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime()
  );

  function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  function formatDayOfWeek() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[selectedDate.getDay()];
  }

  function formatMonth() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
  }

  function goBack() {
    navigation.goBack();
  }

  function handleGetDirections(event) {
    navigation.navigate('Map', {
      nextClassLocation: event.location,
      nextClassSummary: event.summary,
    });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={32} color={MAROON} />
        </Pressable>
        <Text style={styles.title}>Calendar</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.dateHeader}>
        <Text style={styles.dateNumber}>{selectedDate.getDate()}</Text>
        <View>
          <Text style={styles.dateDayOfWeek}>{formatDayOfWeek()}</Text>
          <Text style={styles.dateMonth}>{formatMonth()}</Text>
        </View>
      </View>

      <View style={styles.weekDays}>
        {weekDays.map((date) => {
          const dayIdx = date.getDay();
          const dayLabel = ['Mon','Tue','Wed','Thu','Fri','Sat'][(dayIdx === 0 ? 7 : dayIdx) - 1];
          const isSelected = date.toDateString() === selectedDate.toDateString();
          return (
            <Pressable
              key={date.toISOString()}
              style={[styles.weekDay, isSelected && styles.weekDaySelected]}
              onPress={() => setSelectedDate(new Date(date))}
            >
              <Text style={[styles.weekDayText, isSelected && styles.weekDayTextSelected]}>
                {dayLabel}
              </Text>
              <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumSelected]}>
                {date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.classListHeader}>
        <View style={styles.headerColumn}>
          <Text style={styles.columnTitle}>Time</Text>
        </View>
        <View style={styles.headerColumn}>
          <Text style={styles.columnTitle}>Course</Text>
        </View>
        <Pressable style={styles.filterButton}>
          <MaterialIcons name="tune" size={20} color={MAROON} />
        </Pressable>
      </View>

      <ScrollView style={styles.classList}>
        {todaysClasses.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="event-busy" size={48} color="#CCC" />
            <Text style={styles.emptyText}>No classes scheduled for this day</Text>
          </View>
        ) : (
          todaysClasses.map((event, index) => (
            <View key={index} style={styles.classCard}>
              <View style={styles.classTime}>
                <Text style={styles.timeText}>{formatTime(event.start.dateTime)}</Text>
              </View>
              <View style={styles.classInfo}>
                <View style={styles.classBar} />
                <View style={styles.classContent}>
                  <Text style={styles.className}>{event.summary}</Text>
                  <Text style={styles.classDetail}>No additional info</Text>
                  <View style={styles.locationRow}>
                    <MaterialIcons name="location-on" size={16} color="#666" />
                    <Text style={styles.locationText}>{event.location}</Text>
                  </View>
                </View>
                <Pressable 
                  style={styles.directionsButton}
                  onPress={() => handleGetDirections(event)}
                >
                  <Text style={styles.directionsText}>Get Directions</Text>
                </Pressable>
              </View>
            </View>
          ))
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingHorizontal: 12,
    paddingBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: MAROON,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  dateNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#333',
  },
  dateDayOfWeek: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateMonth: {
    fontSize: 14,
    color: '#666',
  },
  weekDays: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  weekDaySelected: {
    backgroundColor: MAROON,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  weekDayTextSelected: {
    color: '#FFF',
  },
  weekDayNum: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  weekDayNumSelected: {
    color: '#FFF',
  },
  classListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  filterButton: {
    padding: 4,
  },
  classList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  classCard: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  classTime: {
    width: 80,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  classInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  classBar: {
    width: 4,
    backgroundColor: MAROON,
    borderRadius: 2,
  },
  classContent: {
    flex: 1,
  },
  className: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  classDetail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  directionsButton: {
    backgroundColor: MAROON,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  directionsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
});
