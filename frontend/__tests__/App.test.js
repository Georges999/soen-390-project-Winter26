import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  NavigationContainer: ({ children }) => children,
}));

jest.mock('../src/navigation/MainNavigator', () => {
  const { Text } = require('react-native');
  return () => <Text>MainNavigator</Text>;
});

import App from '../src/App';

describe('App (src)', () => {
  it('should render without crashing', () => {
    const { getByText } = render(<App />);
    expect(getByText('MainNavigator')).toBeTruthy();
  });
});
