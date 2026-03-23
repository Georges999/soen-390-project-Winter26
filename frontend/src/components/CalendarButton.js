import React, { useState, useEffect } from 'react';
import { Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import PropTypes from 'prop-types';
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
      console.error('Failed to connect calendar:', error);
      handleAuthError(error?.message || 'unknown error');
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
              console.error('Failed to disconnect calendar:', error);
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

  function getButtonLabel() {
    if (isLoading) {
      return 'Connecting...';
    }

    if (isConnected) {
      return 'Calendar Connected';
    }

    return 'Connect Calendar';
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
        {getButtonLabel()}
      </Text>
    </Pressable>
  );
}

CalendarButton.propTypes = {
  onConnectionChange: PropTypes.func,
};

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
