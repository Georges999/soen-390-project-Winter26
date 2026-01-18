# Screens

This folder contains all screen components for the app.

## Screen Naming Convention
Use descriptive names ending with "Screen":
- `HomeScreen.js`
- `MapScreen.js`
- `DirectionsScreen.js`
- `ScheduleScreen.js`
- `IndoorNavigationScreen.js`
- `SettingsScreen.js`

## Screen Structure
Each screen should:
1. Import necessary components and hooks
2. Handle navigation
3. Manage screen-specific state
4. Be connected to navigation stack

## Example Screen
```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ExampleScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text>Example Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

## Navigation
Screens receive `navigation` prop automatically from React Navigation.
Use `navigation.navigate('ScreenName')` to navigate between screens.
