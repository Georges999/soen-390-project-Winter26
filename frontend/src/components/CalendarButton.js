import React, { useState, useEffect } from 'react';
import { Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  authenticateWithGoogle,
  disconnectCalendar,
  isAuthenticated,
} from '../services/googleCalendarAuth';

export default function CalendarButton({ onConnectionChange }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    const authenticated = await isAuthenticated();
    setIsConnected(authenticated);
    onConnectionChange?.(authenticated);
  }

  async function handleConnect() {
    setIsLoading(true);

    try {
      const result = await authenticateWithGoogle();

      if (result.success) {
        setIsConnected(true);
        onConnectionChange?.(true);
        Alert.alert('Success', 'Calendar connected successfully');
      } else {
        handleAuthError(result.error);
      }
    } catch (error) {
      handleAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Calendar',
      'Are you sure you want to disconnect your calendar?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await disconnectCalendar();
              setIsConnected(false);
              onConnectionChange?.(false);
              Alert.alert('Disconnected', 'Calendar has been disconnected');
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect calendar');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  }

  function handleAuthError(error) {
    let message = 'Failed to connect calendar';

    if (error?.includes('cancel')) {
      message = 'Authentication was cancelled';
    } else if (error?.includes('network')) {
      message = 'Network error. Please check your connection';
    } else if (error?.includes('permission')) {
      message = 'Calendar permission was denied';
    }

    Alert.alert('Connection Failed', message, [
      { text: 'OK' },
      { text: 'Try Again', onPress: handleConnect },
    ]);
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isConnected && styles.buttonConnected,
        pressed && styles.buttonPressed,
      ]}
      onPress={isConnected ? handleDisconnect : handleConnect}
      disabled={isLoading}
    >
      <MaterialIcons
        name={isConnected ? 'event-available' : 'event'}
        size={20}
        color={isConnected ? '#FFF' : '#95223D'}
      />
      <Text style={[styles.buttonText, isConnected && styles.buttonTextConnected]}>
        {isLoading
          ? 'Connecting...'
          : isConnected
          ? 'Calendar Connected'
          : 'Connect Calendar'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#95223D',
    gap: 8,
  },
  buttonConnected: {
    backgroundColor: '#95223D',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#95223D',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextConnected: {
    color: '#FFF',
  },
});
