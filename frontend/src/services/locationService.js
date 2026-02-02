
import * as Location from "expo-location";

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function getUserCoords() {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
  };
}

export async function watchUserCoords(onUpdate) {
  const granted = await requestLocationPermission();
  if (!granted) return null;

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 5000,
      distanceInterval: 10,
    },
    (loc) => {
      onUpdate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    },
  );
}
