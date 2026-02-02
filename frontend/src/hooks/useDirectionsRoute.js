import { useEffect, useState } from "react";
import polyline from "@mapbox/polyline"; //a library that can decode Google’s “encoded polyline string” into actual lat/lng points.
import { GOOGLE_MAPS_API_KEY } from "../config/google";

const MODE_MAP = {
  walking: "walking",
  driving: "driving",
  bicycling: "bicycling",
  transit: "transit",
};

export function useDirectionsRoute({ startCoord, destCoord, mapRef, mode }) {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    // clear when missing one end
    if (!startCoord || !destCoord) {
      setRouteCoords([]);
      setRouteInfo(null);
      return;
    }

    // Transit disabled for now (shuttle will be handled separately)
    if (mode === "transit") {
      setRouteCoords([]);
      setRouteInfo(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const apiMode = MODE_MAP[mode] || "walking"; //travel modes or when missing-> walking
        const isTransit = apiMode === "transit";
        const url =
          `https://maps.googleapis.com/maps/api/directions/json?` +
          `origin=${startCoord.latitude},${startCoord.longitude}` +
          `&destination=${destCoord.latitude},${destCoord.longitude}` +
          `&mode=${apiMode}` +
          (isTransit ? `&departure_time=now` : "") +
          (isTransit ? `&transit_mode=bus|subway|rail|tram` : "") +
          `&key=${GOOGLE_MAPS_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) {
          console.log("Directions API error:", data.status, data.error_message); //when no route is returned
          if (!cancelled) setRouteCoords([]);
          if (!cancelled) setRouteInfo(null);
          return;
        }

        //decode the polyline returned by Google
        const encoded = data.routes[0].overview_polyline.points;
        const points = polyline.decode(encoded).map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        }));

        if (cancelled) return;

        setRouteCoords(points);
        const leg = data.routes[0]?.legs?.[0];
        setRouteInfo(
          leg
            ? {
                durationText: leg.duration?.text ?? "",
                distanceText: leg.distance?.text ?? "",
                steps:
                  leg.steps?.map((step) => ({
                    instruction: step.html_instructions ?? "",
                    distanceText: step.distance?.text ?? "",
                    durationText: step.duration?.text ?? "",
                    endLocation: step.end_location
                      ? {
                          latitude: step.end_location.lat,
                          longitude: step.end_location.lng,
                        }
                      : null,
                    travelMode: step.travel_mode ?? "",
                    transitDetails: step.transit_details
                      ? {
                          departureStop:
                            step.transit_details.departure_stop?.name ?? "",
                          arrivalStop:
                            step.transit_details.arrival_stop?.name ?? "",
                          departureTime:
                            step.transit_details.departure_time?.text ?? "",
                          arrivalTime:
                            step.transit_details.arrival_time?.text ?? "",
                          lineShortName:
                            step.transit_details.line?.short_name ?? "",
                          lineName: step.transit_details.line?.name ?? "",
                          vehicleType:
                            step.transit_details.line?.vehicle?.type ?? "",
                        }
                      : null,
                  })) ?? [],
              }
            : null,
        );

        // zoom to the route
        mapRef?.current?.fitToCoordinates(points, {
          edgePadding: { top: 140, right: 40, bottom: 220, left: 40 },
          animated: true,
        });
      } catch (e) {
        console.log("fetchRoute error:", e);
        if (!cancelled) setRouteCoords([]);
        if (!cancelled) setRouteInfo(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [startCoord, destCoord, mapRef, mode]);

  return { routeCoords, routeInfo };
}
