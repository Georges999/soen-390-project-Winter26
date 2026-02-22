import { useCallback, useEffect, useRef, useState } from "react";

// Simulate movement by stepping through route coordinates over time.
export function useSimulation({ routeCoords, onStart }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedCoord, setSimulatedCoord] = useState(null);

  const simTimerRef = useRef(null);
  const simIndexRef = useRef(0);

  const stopSim = useCallback(() => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    simIndexRef.current = 0;
    setIsSimulating(false);
  }, []);

  const startSim = useCallback(() => {
    if (!Array.isArray(routeCoords) || routeCoords.length === 0) return;

    onStart?.();
    setIsSimulating(true);
    simIndexRef.current = 0;
    setSimulatedCoord(routeCoords[0]);

    simTimerRef.current = setInterval(() => {
      simIndexRef.current += 1;
      if (simIndexRef.current >= routeCoords.length) {
        stopSim();
        return;
      }
      setSimulatedCoord(routeCoords[simIndexRef.current]);
    }, 1000);
  }, [routeCoords, onStart, stopSim]);

  const toggleSim = useCallback(() => {
    if (isSimulating) {
      stopSim();
      return;
    }
    startSim();
  }, [isSimulating, startSim, stopSim]);

  useEffect(() => {
    return () => {
      stopSim();
    };
  }, [stopSim]);

  return {
    isSimulating,
    simulatedCoord,
    startSim,
    stopSim,
    toggleSim,
  };
}
