import { useEffect } from 'react';
import { getUserCoords } from '../services/locationService';

// Default Start = current location 
export function useDefaultStartMyLocation({
  startText,
  setStartText,
  setHasLocationPerm,
  setStartCoord,
}) {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (startText !== '') return;

      const coords = await getUserCoords();
      if (cancelled) return;

      if (coords) {
        setHasLocationPerm(true);
        setStartText('My location');
        setStartCoord(coords); 
      } else {
        setHasLocationPerm(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startText, setStartText, setHasLocationPerm, setStartCoord]);
}
