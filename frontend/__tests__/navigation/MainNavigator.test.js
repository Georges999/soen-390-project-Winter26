import React from 'react';
import { render } from '@testing-library/react-native';

// Mock bottom-tabs (not installed) with virtual: true
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }) => <View testID="tab-navigator">{children}</View>,
      Screen: ({ name, component: Component, options }) => {
        const label = options?.tabBarLabel || name;
        return (
          <View testID={`tab-screen-${name}`}>
            <Text>{label}</Text>
          </View>
        );
      },
    }),
  };
}, { virtual: true });

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({ children }) => <View testID="stack-navigator">{children}</View>,
      Screen: ({ name }) => <View testID={`stack-screen-${name}`} />,
    }),
  };
});

// Mock all screen components
jest.mock('../../src/screens/MapScreen', () => {
  const { Text } = require('react-native');
  return function MockMapScreen() { return <Text>MapScreen</Text>; };
});

jest.mock('../../src/screens/ProfileScreen', () => {
  const { Text } = require('react-native');
  return function MockProfileScreen() { return <Text>ProfileScreen</Text>; };
});

jest.mock('../../src/screens/CalendarScreen', () => {
  const { Text } = require('react-native');
  return function MockCalendarScreen() { return <Text>CalendarScreen</Text>; };
});

jest.mock('../../src/screens/NextClassScreen', () => {
  const { Text } = require('react-native');
  return function MockNextClassScreen() { return <Text>NextClassScreen</Text>; };
});

import MainNavigator from '../../src/navigation/MainNavigator';

describe('MainNavigator', () => {
  it('should render without crashing', () => {
    const { toJSON } = render(<MainNavigator />);
    expect(toJSON()).toBeTruthy();
  });

  it('should render Map tab', () => {
    const { getByText } = render(<MainNavigator />);
    expect(getByText('Map')).toBeTruthy();
  });

  it('should render Next Class tab', () => {
    const { getByText } = render(<MainNavigator />);
    expect(getByText('Next Class')).toBeTruthy();
  });

  it('should render Profile tab', () => {
    const { getByText } = render(<MainNavigator />);
    expect(getByText('Profile')).toBeTruthy();
  });
});
