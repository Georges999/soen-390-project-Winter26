import { useEffect, useState } from "react";
import * as Speech from "expo-speech";
import { distanceMeters } from "../utils/geoUtils";
import { stripHtml } from "../utils/textUtils";

// Keep turn-by-turn step index in sync with user movement and optional TTS.
export function useNavigationSteps({
  navActive,
  userCoord,
  routeInfo,
  speechEnabled,
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (!navActive || !userCoord || !routeInfo?.steps?.length) return;
    const currentStep = routeInfo.steps[currentStepIndex];
    if (!currentStep?.endLocation) return;

    const meters = distanceMeters(userCoord, currentStep.endLocation);
    if (meters > 25) return;

    const nextIndex = Math.min(currentStepIndex + 1, routeInfo.steps.length - 1);

    if (nextIndex !== currentStepIndex) {
      setCurrentStepIndex(nextIndex);
      const nextInstruction = routeInfo.steps[nextIndex]?.instruction;
      if (nextInstruction && speechEnabled) {
        Speech.stop();
        Speech.speak(stripHtml(nextInstruction));
      }
    }
  }, [navActive, userCoord, routeInfo, currentStepIndex, speechEnabled]);

  return { currentStepIndex, setCurrentStepIndex };
}
