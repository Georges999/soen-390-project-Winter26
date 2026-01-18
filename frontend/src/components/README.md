# Components

This folder contains reusable UI components used across multiple screens.

## Component Organization
Keep components modular and reusable:
- `Button.js` - Custom button component
- `Card.js` - Card container component
- `Header.js` - Header component
- `LoadingSpinner.js` - Loading indicator
- `Modal.js` - Custom modal component

## Component Guidelines
1. **Reusable:** Components should work in multiple contexts
2. **Props:** Accept props for customization
3. **Styled:** Include default styles, allow style overrides
4. **Documented:** Add prop type comments

## Example Component
```javascript
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

/**
 * Custom Button Component
 * @param {string} title - Button text
 * @param {function} onPress - Press handler
 * @param {object} style - Custom styles
 */
export default function Button({ title, onPress, style }) {
  return (
    <TouchableOpacity 
      style={[styles.button, style]} 
      onPress={onPress}
    >
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#912338',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
```
