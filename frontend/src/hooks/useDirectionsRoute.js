import { useEffect, useState } from "react";
import polyline from "@mapbox/polyline"; //a library that can decode Google’s “encoded polyline string” into actual lat/lng points.
import { GOOGLE_MAPS_API_KEY } from "../config/google";

const MODE_MAP = {
  walking: "walking",
  driving: "driving",
  bicycling: "bicycling",
  transit: "transit",
};

export function useDirectionsRoute({
  startCoord,
  destCoord,
  mapRef,
  mode,
  routeIndex = 0,
  originOverride = null,
  destinationOverride = null,
  waypoints = null,
}) {
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeOptions, setRouteOptions] = useState([]);

  useEffect(() => {
    // clear when missing one end or when directions are disabled
    const hasOrigin = Boolean(originOverride) || Boolean(startCoord);
    const hasDestination = Boolean(destinationOverride) || Boolean(destCoord);
    if (!hasOrigin || !hasDestination || !mode) {
      setRouteCoords([]);
      setRouteInfo(null);
      setRouteOptions([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const apiMode = MODE_MAP[mode] || "walking"; //travel modes or when missing-> walking
        const isTransit = apiMode === "transit";
        const originParam = originOverride
          ? encodeURIComponent(originOverride)
          : `${startCoord.latitude},${startCoord.longitude}`;
        const destinationParam = destinationOverride
          ? encodeURIComponent(destinationOverride)
          : `${destCoord.latitude},${destCoord.longitude}`;
        const waypointsParam = Array.isArray(waypoints) && waypoints.length
          ? `&waypoints=${waypoints.map((p) => encodeURIComponent(p)).join("|")}`
          : "";
        const url =
          `https://maps.googleapis.com/maps/api/directions/json?` +
          `origin=${originParam}` +
          `&destination=${destinationParam}` +
          `&mode=${apiMode}` +
          waypointsParam +
          (isTransit ? `&departure_time=now` : "") +
          (isTransit ? `&transit_mode=bus|subway` : "") +
          (isTransit ? `&alternatives=true` : "") +
          `&key=${GOOGLE_MAPS_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (!data.routes?.length) {
          console.log("Directions API error:", data.status, data.error_message); //when no route is returned
          if (!cancelled) setRouteCoords([]);
          if (!cancelled) setRouteInfo(null);
          if (!cancelled) setRouteOptions([]);
          return;
        }

        const pickBestRoute = (routes) => {
          if (!routes?.length) return null;
          if (!isTransit) return routes[0];
          return routes.reduce((best, current) => {
            const bestDur = best?.legs?.[0]?.duration?.value ?? Infinity;
            const curDur = current?.legs?.[0]?.duration?.value ?? Infinity;
            return curDur < bestDur ? current : best;
          }, routes[0]);
        };

        const buildRouteOptions = (routes) =>
          routes.map((route) => {
            const leg = route?.legs?.[0];
            const steps = leg?.steps ?? [];
            const transitSteps = steps.filter(
              (step) => step.travel_mode === "TRANSIT",
            );
            const transitLines = transitSteps
              .map((step) => {
                const line = step.transit_details?.line;
                return (
                  line?.short_name ||
                  line?.name ||
                  line?.vehicle?.type ||
                  "Transit"
                );
              })
              .filter(Boolean);
            const transitVehicles = transitSteps
              .map((step) => step.transit_details?.line?.vehicle?.type || "")
              .filter(Boolean);
            return {
              durationText: leg?.duration?.text ?? "",
              durationValue: leg?.duration?.value ?? Infinity,
              distanceText: leg?.distance?.text ?? "",
              transitLines,
              transitVehicles,
            };
          });

        const options = isTransit ? buildRouteOptions(data.routes) : [];
        const clampedIndex = Math.min(
          Math.max(routeIndex, 0),
          isTransit ? Math.max(options.length - 1, 0) : 0,
        );
        const selectedRoute = isTransit
          ? data.routes[clampedIndex]
          : pickBestRoute(data.routes);

        //decode the polyline returned by Google
        const encoded = selectedRoute?.overview_polyline?.points;
        if (!encoded) {
          if (!cancelled) setRouteCoords([]);
          if (!cancelled) setRouteInfo(null);
          if (!cancelled) setRouteOptions([]);
          return;
        }
        const points = polyline.decode(encoded).map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        }));

        if (cancelled) return;

        setRouteCoords(points);
        if (!cancelled) setRouteOptions(options);
        const leg = selectedRoute?.legs?.[0];
        setRouteInfo(
          leg
            ? {
                durationText: leg.duration?.text ?? "",
                distanceText: leg.distance?.text ?? "",
                steps:
                  leg.steps?.map((step) => ({
                    coords: (() => {
                      if (!step.polyline?.points) return [];
                      try {
                        return polyline
                          .decode(step.polyline.points)
                          .map(([lat, lng]) => ({
                            latitude: lat,
                            longitude: lng,
                          }));
                      } catch {
                        return [];
                      }
                    })(),
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
                          numStops: step.transit_details.num_stops ?? null,
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
        if (!cancelled) setRouteOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    startCoord,
    destCoord,
    mapRef,
    mode,
    routeIndex,
    originOverride,
    destinationOverride,
    waypoints,
  ]);

  return { routeCoords, routeInfo, routeOptions };
}
