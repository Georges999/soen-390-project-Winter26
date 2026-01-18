# Services

This folder contains shared service modules for API calls and external integrations.

## Service Types

### API Client
`apiClient.js` - Base API configuration
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

### Location Service
`locationService.js` - User location and permissions
```javascript
import * as Location from 'expo-location';

export const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied');
  }
  return await Location.getCurrentPositionAsync({});
};
```

### Storage Service
`storageService.js` - Local data persistence
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveData = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving data:', error);
  }
};
```

### Map Service
`mapService.js` - Google Maps integration
- Geocoding
- Directions API calls
- Map styling

### Calendar Service
`calendarService.js` - Calendar integration
- Google Calendar API
- Class schedule parsing

## Service Guidelines
1. **Single Responsibility:** Each service handles one domain
2. **Error Handling:** Always handle and throw meaningful errors
3. **Async/Await:** Use async/await for all async operations
4. **Export Functions:** Export individual functions, not classes
5. **Shared Logic:** Services are used across multiple features

## Example Service
```javascript
import apiClient from './apiClient';

/**
 * Get building information
 * @param {string} buildingId - Building identifier
 * @returns {Promise<Object>} Building data
 */
export const getBuilding = async (buildingId) => {
  try {
    const response = await apiClient.get(`/api/buildings/${buildingId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching building:', error);
    throw error;
  }
};

/**
 * Get all buildings on campus
 * @param {string} campus - 'SGW' or 'Loyola'
 * @returns {Promise<Array>} List of buildings
 */
export const getBuildingsByCampus = async (campus) => {
  try {
    const response = await apiClient.get(`/api/buildings?campus=${campus}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching buildings:', error);
    throw error;
  }
};
```
