import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// REACT NATIVE APp starter code
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campus Guide</Text>
      <Text style={styles.subtitle}>Concordia University Navigation App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#912338',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
    fontSize: 16,
    color: '#999',
    marginTop: 20,
  },
});
