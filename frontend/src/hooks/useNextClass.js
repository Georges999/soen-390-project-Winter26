import { useState, useEffect } from 'react';
import { getNextClassEvent, parseBuildingFromLocation } from '../services/googleCalendarService';

export function useNextClass() {
  const [nextClass, setNextClass] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNextClass();
    const interval = setInterval(fetchNextClass, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchNextClass() {
    setIsLoading(true);
    setError(null);

    try {
      const classEvent = await getNextClassEvent();
      setNextClass(classEvent);
    } catch (err) {
      setError(err.message);
      setNextClass(null);
    } finally {
      setIsLoading(false);
    }
  }

  function getBuildingFromClass() {
    if (!nextClass || !nextClass.location) return null;
    return parseBuildingFromLocation(nextClass.location);
  }

  return {
    nextClass,
    isLoading,
    error,
    refresh: fetchNextClass,
    buildingCode: getBuildingFromClass(),
  };
}
