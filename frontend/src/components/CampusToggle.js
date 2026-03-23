import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

export default function CampusToggle({ campuses, selectedId, onSelect }) {
  const campusList = Array.isArray(campuses) ? campuses : [];

  return (
    <View style={styles.container}>
      {campusList.map((campus) => {
        const isSelected = campus.id === selectedId;
        return (
          <Pressable
            key={campus.id}
            style={[styles.button, isSelected && styles.buttonSelected]}
            onPress={() => onSelect(campus.id)}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {campus.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

CampusToggle.propTypes = {
  campuses: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
    })
  ).isRequired,
  selectedId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onSelect: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 999,
    padding: 4,
    alignSelf: 'center',
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  buttonSelected: {
    backgroundColor: '#912338',
  },
  label: {
    fontSize: 14,
    color: '#555',
    fontWeight: '600',
  },
  labelSelected: {
    color: '#fff',
  },
});
