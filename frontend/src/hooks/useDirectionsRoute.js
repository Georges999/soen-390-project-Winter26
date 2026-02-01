import { useEffect, useState } from 'react';
import polyline from '@mapbox/polyline';
import { GOOGLE_MAPS_API_KEY } from '../config/google';

export function useDirectionsRoute({ startCoord, destCoord, mapRef }) {
  const [routeCoords, setRouteCoords] = useState([]);

  useEffect(() => {
    // clear when missing one end
    if (!startCoord || !destCoord) {
      setRouteCoords([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const url =
          `https://maps.googleapis.com/maps/api/directions/json?` +
          `origin=${startCoord.latitude},${startCoord.longitude}` +
          `&destination=${destCoord.latitude},${destCoord.longitude}` +
          `&mode=walking` +
          `&key=${GOOGLE_MAPS_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) {
          console.log('Directions API error:', data.status, data.error_message);
          if (!cancelled) setRouteCoords([]);
          return;
        }

        const encoded = data.routes[0].overview_polyline.points;
        const points = polyline.decode(encoded).map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        }));

        if (cancelled) return;

        setRouteCoords(points);

        // zoom to the route
        mapRef?.current?.fitToCoordinates(points, {
          edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
          animated: true,
        });
      } catch (e) {
        console.log('fetchRoute error:', e);
        if (!cancelled) setRouteCoords([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startCoord, destCoord, mapRef]);

  return { routeCoords };
}
