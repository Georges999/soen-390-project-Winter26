import { useEffect, useRef } from 'react';
import { getUserCoords } from '../services/locationService';

// Default Start = current location 
export function useDefaultStartMyLocation({
  startText,
  setStartText,
  setHasLocationPerm,
  setStartCoord,
}) {
  const didAutoFill = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (didAutoFill.current) return;
      if (startText !== '') return;

      const coords = await getUserCoords();
      if (cancelled) return;

      if (coords) {
        setHasLocationPerm(true);
        setStartText('My location');
        setStartCoord(coords);
        didAutoFill.current = true;
      } else {
        setHasLocationPerm(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startText, setStartText, setHasLocationPerm, setStartCoord]);
}
