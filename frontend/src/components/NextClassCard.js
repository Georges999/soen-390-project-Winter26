import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function NextClassCard({ nextClass, buildingCode, onNavigate }) {
  if (!nextClass) return null;

  const startTime = new Date(nextClass.startTime);
  const timeString = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const minutesUntil = Math.floor((startTime - new Date()) / 1000 / 60);
  const isUpcoming = minutesUntil > 0 && minutesUntil <= 60;

  return (
    <Pressable style={styles.card} onPress={onNavigate}>
      <View style={styles.header}>
        <MaterialIcons name="schedule" size={20} color="#95223D" />
        <Text style={styles.title}>Next Class</Text>
      </View>

      <Text style={styles.className}>{nextClass.title}</Text>

      <View style={styles.details}>
        <Text style={styles.time}>{timeString}</Text>
        {isUpcoming && (
          <Text style={styles.upcoming}>in {minutesUntil} min</Text>
        )}
      </View>

      {buildingCode && (
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color="#666" />
          <Text style={styles.location}>{buildingCode}</Text>
        </View>
      )}

      <Pressable style={styles.navigateButton} onPress={onNavigate}>
        <Text style={styles.navigateText}>Navigate</Text>
        <MaterialIcons name="arrow-forward" size={16} color="#FFF" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#95223D',
    textTransform: 'uppercase',
  },
  className: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  time: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  upcoming: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  location: {
    fontSize: 13,
    color: '#666',
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#95223D',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  navigateText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
