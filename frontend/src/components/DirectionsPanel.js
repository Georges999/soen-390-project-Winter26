import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

function getVehicleIcon(vehicleType) {
  return vehicleType === "SUBWAY" ? "subway" : "directions-bus";
}

function formatEtaSuffix(durationValue) {
  if (!durationValue || !Number.isFinite(durationValue)) {
    return "";
  }

  const now = new Date();
  const mins = Math.round(durationValue / 60);
  const eta = new Date(now.getTime() + mins * 60000);
  const hh = eta.getHours().toString().padStart(2, "0");
  const mm = eta.getMinutes().toString().padStart(2, "0");

  return ` (ETA ${hh}:${mm})`;
}

function getStepIcon(step) {
  if (step.travelMode !== "TRANSIT") {
    return "directions-walk";
  }

  return getVehicleIcon(step.transitDetails?.vehicleType || "");
}

function getStepInstruction(step, stripHtml) {
  return (
    step.transitDetails?.lineShortName ||
    step.transitDetails?.lineName ||
    stripHtml(step.instruction || "")
  );
}

export default function DirectionsPanel({
  styles,
  maroon,
  travelMode,
  setTravelMode,
  isCrossCampusTrip,
  transitSubMode,
  setTransitSubMode,
  setIsShuttleModalOpen,
  isTransitCollapsed,
  setIsTransitCollapsed,
  routeOptions,
  transitRouteIndex,
  setTransitRouteIndex,
  routeInfo,
  stripHtml,
  speechEnabled,
  onToggleSpeech,
  isSimulating,
  onSimulate,
  onGo,
}) {
  const showTransitPanel = travelMode === "transit" && isCrossCampusTrip;

  const renderModeButton = (mode, label, iconName) => {
    const isSelected = travelMode === mode;
    return (
      <Pressable
        key={mode}
        style={[styles.modeBtn, isSelected && styles.modeBtnActive]}
        onPress={() => setTravelMode(mode)}
      >
        <MaterialIcons name={iconName} size={18} color={isSelected ? maroon : "#111"} />
        <Text style={[styles.modeBtnLabel, isSelected && styles.modeBtnTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderTransitSubButton = (mode, label, onPress) => {
    const isSelected = transitSubMode === mode;
    return (
      <Pressable
        key={mode}
        style={[styles.transitSubBtn, isSelected && styles.transitSubBtnActive]}
        onPress={onPress}
      >
        <Text style={[styles.transitSubText, isSelected && styles.transitSubTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderTransitStep = (step, stepIdx) => {
    const icon = getStepIcon(step);
    const instruction = getStepInstruction(step, stripHtml);

    return (
      <View key={`step-${stepIdx}`} style={styles.transitStepRow}>
        <MaterialIcons name={icon} size={16} color="#111" />
        <Text style={styles.transitStepText}>
          {instruction}
          {step.travelMode === "TRANSIT" && (
            <>
              {step.transitDetails?.arrivalStop && (
                <Text style={styles.transitStopName}> ({step.transitDetails.arrivalStop})</Text>
              )}
              {step.transitDetails?.numStops != null && (
                <Text style={styles.transitStopCount}> • {step.transitDetails.numStops} stops</Text>
              )}
            </>
          )}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.directionsWrap} pointerEvents="box-none">
      <View style={styles.directionsPanel}>
        <View style={styles.modeRow}>
          {renderModeButton("driving", "Car", "directions-car")}
          {renderModeButton("walking", "Walk", "directions-walk")}
          {renderModeButton("bicycling", "Bike", "directions-bike")}

          {isCrossCampusTrip && (
            renderModeButton("transit", "Transit", "directions-transit")
          )}
        </View>

        {showTransitPanel && (
          <View style={styles.shuttlePanel}>
            <View style={styles.transitSubRow}>
              {renderTransitSubButton("shuttle", "Shuttle", () => {
                setTransitSubMode("shuttle");
                setIsShuttleModalOpen(true);
              })}
              {renderTransitSubButton("public", "Public", () => setTransitSubMode("public"))}
            </View>

            {transitSubMode === "public" && (
              <>
                <View style={styles.transitHeaderRow}>
                  <Text style={styles.shuttleNote}>
                    Showing 3 shortest public transit routes.
                  </Text>
                  <Pressable
                    onPress={() => setIsTransitCollapsed((prev) => !prev)}
                    style={styles.collapseBtn}
                  >
                    <MaterialIcons
                      name={isTransitCollapsed ? "expand-less" : "expand-more"}
                      size={18}
                      color={maroon}
                    />
                  </Pressable>
                </View>

                {!isTransitCollapsed && (
                  <View style={styles.transitList}>
                    {routeOptions.length === 0 ? (
                      <Text style={styles.transitEmpty}>
                        No public transit routes found.
                      </Text>
                    ) : (
                      routeOptions.slice(0, 3).map((opt, idx) => {
                        const isSelected = idx === transitRouteIndex;
                        return (
                          <Pressable
                            key={`route-${idx}`}
                            onPress={() => setTransitRouteIndex(idx)}
                            style={[
                              styles.transitRow,
                              isSelected && styles.transitRowActive,
                            ]}
                          >
                            <View style={styles.transitSummaryRow}>
                              <View style={styles.transitSummaryLeft}>
                                {(opt.transitVehicles || [])
                                  .slice(0, 3)
                                  .map((vehicle, vIdx) => {
                                    const icon =
                                      vehicle === "SUBWAY"
                                        ? "subway"
                                        : "directions-bus";
                                    const line = opt.transitLines?.[vIdx] || "Transit";
                                    return (
                                      <View key={`veh-${idx}-${vIdx}`} style={styles.transitBadge}>
                                        <MaterialIcons
                                          name={icon}
                                          size={14}
                                          color={isSelected ? maroon : "#111"}
                                        />
                                        <Text
                                          style={[
                                            styles.transitBadgeText,
                                            isSelected && styles.transitLineActive,
                                          ]}
                                        >
                                          {line}
                                        </Text>
                                      </View>
                                    );
                                  })}
                              </View>
                              <Text style={styles.transitMeta}>
                                {opt.durationText || "--"}
                                {formatEtaSuffix(opt.durationValue)}
                              </Text>
                            </View>
                            <Text style={styles.transitStops}>Tap to view details</Text>
                            {isSelected && routeInfo?.steps?.length > 0 && (
                              <View style={styles.transitSteps}>{routeInfo.steps.map(renderTransitStep)}</View>
                            )}
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        <View style={styles.routeInfoRow}>
          <View>
            <Text style={styles.routeInfoTitle}>{routeInfo?.durationText ?? "--"}</Text>
            <Text style={styles.routeInfoSub}>{routeInfo?.distanceText ?? ""}</Text>
          </View>

          <View style={styles.routeInfoActions}>
            <Pressable
              style={[styles.muteBtn, !speechEnabled && styles.muteBtnActive]}
              onPress={onToggleSpeech}
            >
              <MaterialIcons
                name={speechEnabled ? "volume-up" : "volume-off"}
                size={18}
                color={speechEnabled ? "#111" : maroon}
              />
            </Pressable>

            <Pressable
              style={[styles.simBtn, isSimulating && styles.simBtnActive]}
              onPress={onSimulate}
            >
              <Text style={[styles.simBtnText, isSimulating && styles.simBtnTextActive]}>
                {isSimulating ? "Stop" : "Simulate"}
              </Text>
            </Pressable>

            <Pressable style={styles.goBtn} onPress={onGo} testID="go-btn">
              <Text style={styles.goBtnText}>GO</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

DirectionsPanel.propTypes = {
  styles: PropTypes.shape({
    directionsWrap: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    directionsPanel: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    modeRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    modeBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    modeBtnActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    modeBtnLabel: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    modeBtnTextActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    shuttlePanel: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSubRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSubBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSubBtnActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSubText: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSubTextActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitHeaderRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    shuttleNote: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    collapseBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitList: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitEmpty: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitRowActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSummaryRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSummaryLeft: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitBadge: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitBadgeText: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitLineActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitMeta: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitStops: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitSteps: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitStepRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitStepText: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitStopName: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    transitStopCount: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    routeInfoRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    routeInfoTitle: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    routeInfoSub: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    routeInfoDistanceText: PropTypes.oneOfType([
      PropTypes.object,
      PropTypes.array,
      PropTypes.number,
    ]),
    routeInfoActions: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    muteBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    muteBtnActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    simBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    simBtnActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    simBtnText: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    simBtnTextActive: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    goBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
    goBtnText: PropTypes.oneOfType([PropTypes.object, PropTypes.array, PropTypes.number]),
  }).isRequired,
  maroon: PropTypes.string.isRequired,
  travelMode: PropTypes.string.isRequired,
  setTravelMode: PropTypes.func.isRequired,
  isCrossCampusTrip: PropTypes.bool.isRequired,
  transitSubMode: PropTypes.string.isRequired,
  setTransitSubMode: PropTypes.func.isRequired,
  setIsShuttleModalOpen: PropTypes.func.isRequired,
  isTransitCollapsed: PropTypes.bool.isRequired,
  setIsTransitCollapsed: PropTypes.func.isRequired,
  routeOptions: PropTypes.array.isRequired,
  transitRouteIndex: PropTypes.number.isRequired,
  setTransitRouteIndex: PropTypes.func.isRequired,
  routeInfo: PropTypes.object,
  stripHtml: PropTypes.func.isRequired,
  speechEnabled: PropTypes.bool.isRequired,
  onToggleSpeech: PropTypes.func.isRequired,
  isSimulating: PropTypes.bool.isRequired,
  onSimulate: PropTypes.func.isRequired,
  onGo: PropTypes.func.isRequired,
};
