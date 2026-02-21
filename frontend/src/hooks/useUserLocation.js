import { useEffect, useState } from "react";
import { watchUserCoords } from "../services/locationService";

// Track device GPS updates and expose the latest user coordinate.
export function useUserLocation({ setHasLocationPerm }) {
  const [userCoord, setUserCoord] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let subscription = null;

    (async () => {
      try {
        const sub = await watchUserCoords((coords) => {
          if (cancelled) return;
          setHasLocationPerm(true);
          setUserCoord(coords);
        });

        if (cancelled) return;
        subscription = sub;
        if (!sub) setHasLocationPerm(false);
      } catch {
        if (!cancelled) setHasLocationPerm(false);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove?.();
    };
  }, [setHasLocationPerm]);

  return { userCoord };
}
