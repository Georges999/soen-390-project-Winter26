import { useEffect, useState } from "react";
import { findBuildingUserIsIn } from "../utils/geo";

// Resolve which building the current user coordinate belongs to.
export function useCurrentBuilding({ userCoord, allBuildings }) {
  const [currentBuilding, setCurrentBuilding] = useState(null);

  useEffect(() => {
    if (!userCoord) {
      setCurrentBuilding(null);
      return;
    }

    const found = findBuildingUserIsIn(userCoord, allBuildings);
    setCurrentBuilding(found ?? null);
  }, [userCoord, allBuildings]);

  return { currentBuilding };
}
