import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { isAuthenticated } from '../services/googleCalendarAuth';
import { fetchCalendarEvents } from '../services/googleCalendarService';
import {
  getEventLocation,
  getEventStartValue,
  getEventSummary,
  getLegacyClassesForDate,
  getLiveClassesForDate,
  getWeekDays,
  getWeekRange,
} from '../domain/calendar/calendarDomain';

const MAROON = '#95223D';

export default function CalendarScreen({ navigation, route }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const weekDays = getWeekDays(selectedDate);
  const routeCalendars = route?.params?.calendars;
  const selectedCalendarIds = route?.params?.selectedCalendarIds;

  const loadWeekEvents = useCallback(async (referenceDate) => {
    setIsLoading(true);
    setError(null);

    try {
      const authenticated = await isAuthenticated();
      setIsConnected(authenticated);

      if (!authenticated) {
        setEvents([]);
        return;
      }

      const { timeMin, timeMax } = getWeekRange(referenceDate);
      const result = await fetchCalendarEvents(
        selectedCalendarIds,
        timeMin,
        timeMax
      );

      if (result.success) {
        setEvents(result.events);
      } else {
        setEvents([]);
        setError(result.error || 'Failed to load calendar events');
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCalendarIds]);

  useEffect(() => {
    if (!routeCalendars) {
      loadWeekEvents(selectedDate);
    }
  }, [loadWeekEvents, routeCalendars, selectedDate]);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      if (!routeCalendars) {
        loadWeekEvents(selectedDate);
      }
    });

    return unsubscribe;
  }, [loadWeekEvents, navigation, routeCalendars, selectedDate]);

  const todaysClasses = routeCalendars
    ? getLegacyClassesForDate(routeCalendars, selectedDate)
    : getLiveClassesForDate(events, selectedDate);
  const emptySubtext = !routeCalendars && !isConnected
    ? 'Connect Google Calendar from Profile to see your schedule.'
    : error || null;

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
    const nextClassSummary = getEventSummary(event);

    navigation.navigate('Map', {
      nextClassLocation: getEventLocation(event),
      nextClassSummary,
    });
  }

  let listContent;

  if (isLoading) {
    listContent = (
      <View style={styles.emptyState}>
        <MaterialIcons name="schedule" size={48} color="#CCC" />
        <Text style={styles.emptyText}>Loading calendar...</Text>
      </View>
    );
  } else if (todaysClasses.length === 0) {
    listContent = (
      <View style={styles.emptyState}>
        <MaterialIcons name="event-busy" size={48} color="#CCC" />
        <Text style={styles.emptyText}>No classes scheduled for this day</Text>
        {emptySubtext ? <Text style={styles.emptySubtext}>{emptySubtext}</Text> : null}
      </View>
    );
  } else {
    listContent = todaysClasses.map((event, index) => {
      const eventStartValue = getEventStartValue(event);
      const eventSummary = getEventSummary(event);
      const eventLocation = getEventLocation(event);
      const stepKey =
        event.id ||
        `${eventStartValue}-${eventSummary || 'class'}-${index}`;

      return (
        <View key={stepKey} style={styles.classCard}>
          <View style={styles.classTime}>
            <Text style={styles.timeText}>
              {formatTime(eventStartValue)}
            </Text>
          </View>
          <View style={styles.classInfo}>
            <View style={styles.classBar} />
            <View style={styles.classContent}>
              <Text style={styles.className}>{eventSummary}</Text>
              <Text style={styles.classDetail}>No additional info</Text>
              <View style={styles.locationRow}>
                <MaterialIcons name="location-on" size={16} color="#666" />
                <Text style={styles.locationText}>{eventLocation}</Text>
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
      );
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
          const dayLabel = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][
            (dayIdx === 0 ? 7 : dayIdx) - 1
          ];
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
        {listContent}
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
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
  directionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
});

CalendarScreen.propTypes = {
  navigation: PropTypes.shape({
    addListener: PropTypes.func,
    goBack: PropTypes.func.isRequired,
    navigate: PropTypes.func.isRequired,
  }).isRequired,
  route: PropTypes.shape({
    params: PropTypes.shape({
      calendars: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string,
          name: PropTypes.string,
          selected: PropTypes.bool,
          events: PropTypes.arrayOf(PropTypes.object),
        })
      ),
      selectedCalendarIds: PropTypes.arrayOf(PropTypes.string),
    }),
  }),
};

CalendarScreen.defaultProps = {
  route: undefined,
};
