import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  return {
    createBottomTabNavigator: () => ({
      Navigator: ({ children }) => {
        const tabs = React.Children.toArray(children);
        const [activeTab, setActiveTab] = React.useState(tabs[0]?.props?.name);
        const current = tabs.find((tab) => tab.props.name === activeTab) || tabs[0];
        const CurrentComponent = current?.props?.component;

        return (
          <View testID="tab-navigator">
            <View>
              {tabs.map((tab) => {
                const options = tab.props.options || {};
                const label = options.tabBarLabel || tab.props.name;
                let icon = null;
                if (typeof options.tabBarIcon === 'function') {
                  icon = options.tabBarIcon({ color: '#111', size: 18 });
                }
                return (
                  <Pressable
                    key={tab.props.name}
                    testID={`tab-${tab.props.name}`}
                    onPress={() => setActiveTab(tab.props.name)}
                  >
                    {icon}
                    <Text>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View testID={`active-tab-${activeTab}`}>
              {CurrentComponent ? <CurrentComponent /> : null}
            </View>
          </View>
        );
      },
      Screen: () => null,
    }),
  };
});

jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    createStackNavigator: () => ({
      Navigator: ({ children }) => {
        const screens = React.Children.toArray(children);
        const first = screens[0];
        const ScreenComponent = first?.props?.component;
        return <View testID="stack-navigator">{ScreenComponent ? <ScreenComponent /> : null}</View>;
      },
      Screen: () => null,
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

jest.mock('../../src/screens/IndoorMapScreen', () => {
  const { Text } = require('react-native');
  return function MockIndoorMapScreen() { return <Text>IndoorMapScreen</Text>; };
});

jest.mock('../../src/screens/IndoorDirectionsScreen', () => {
  const { Text } = require('react-native');
  return function MockIndoorDirectionsScreen() { return <Text>IndoorDirectionsScreen</Text>; };
});

import MainNavigator from '../../src/navigation/MainNavigator';

describe('MainNavigator', () => {
  it('navigates between tab screens', () => {
    const { getByTestId, getByText } = render(<MainNavigator />);

    expect(getByText('MapScreen')).toBeTruthy();

    fireEvent.press(getByTestId('tab-NextClass'));
    expect(getByText('NextClassScreen')).toBeTruthy();

    fireEvent.press(getByTestId('tab-Indoor'));
    expect(getByText('IndoorMapScreen')).toBeTruthy();

    fireEvent.press(getByTestId('tab-Profile'));
    expect(getByText('ProfileScreen')).toBeTruthy();
  });

  it('renders tabs including custom and default labels', () => {
    const { getByText } = render(<MainNavigator />);

    expect(getByText('Map')).toBeTruthy();
    expect(getByText('Next Class')).toBeTruthy();
  });
});
