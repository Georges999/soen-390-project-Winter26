import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

const MAROON = "#95223D";

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
        <MaterialIcons name={iconName} size={18} color={isSelected ? MAROON : "#111"} />
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

  const renderTransitStep = (step) => {
    const icon = getStepIcon(step);
    const instruction = getStepInstruction(step, stripHtml);
    const stepKey = `${step.instruction || "unknown"}|${step.distanceText || ""}|${step.durationText || ""}`;

    return (
      <View key={stepKey} style={styles.transitStepRow}>
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
                      color={MAROON}
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
                        const routeKey = `${opt.durationValue || "0"}-${opt.distanceText || ""}-${(opt.transitLines || []).join("|")}-${(opt.transitVehicles || []).join("|")}`;
                        return (
                          <Pressable
                            key={routeKey}
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
                                    const vehicleKey = `${line}-${vehicle || ""}`;
                                    return (
                                      <View key={`veh-${vehicleKey}`} style={styles.transitBadge}>
                                        <MaterialIcons
                                          name={icon}
                                          size={14}
                                          color={isSelected ? MAROON : "#111"}
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
                color={speechEnabled ? "#111" : MAROON}
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

const styles = StyleSheet.create({
  directionsWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  directionsPanel: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  modeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  modeBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  modeBtnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
  },
  modeBtnTextActive: {
    color: MAROON,
  },
  shuttlePanel: {
    marginTop: 8,
    marginBottom: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#F7F7F7",
  },
  transitSubRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  transitSubBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  transitSubBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  transitSubText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#444",
  },
  transitSubTextActive: {
    color: MAROON,
  },
  shuttleNote: {
    marginTop: 6,
    fontSize: 11,
    color: "#666",
    textAlign: "center",
  },
  transitList: {
    marginTop: 8,
    gap: 8,
  },
  transitSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  transitSummaryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  transitBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: "#F3F3F3",
  },
  transitBadgeText: {
    fontSize: 11,
    color: "#111",
    fontWeight: "700",
  },
  transitMeta: {
    fontSize: 11,
    color: "#555",
    fontWeight: "700",
  },
  transitHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  collapseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  transitRow: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDEDED",
  },
  transitRowActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.06)",
  },
  transitLineActive: {
    color: MAROON,
  },
  transitStops: {
    marginTop: 2,
    fontSize: 11,
    color: "#444",
  },
  transitEmpty: {
    fontSize: 11,
    color: "#666",
    textAlign: "center",
    paddingVertical: 6,
  },
  transitSteps: {
    marginTop: 6,
    gap: 4,
  },
  transitStepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transitStepText: {
    fontSize: 11,
    color: "#333",
    flex: 1,
  },
  transitStopName: {
    fontSize: 11,
    color: "#333",
  },
  transitStopCount: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  routeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  routeInfoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  routeInfoSub: {
    marginTop: 2,
    fontSize: 12,
    color: "#666",
  },
  goBtn: {
    backgroundColor: MAROON,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  goBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  simBtn: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#fff",
  },
  simBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
  simBtnText: {
    color: "#444",
    fontSize: 12,
    fontWeight: "700",
  },
  simBtnTextActive: {
    color: MAROON,
  },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  muteBtnActive: {
    borderColor: MAROON,
    backgroundColor: "rgba(149, 34, 61, 0.08)",
  },
});

DirectionsPanel.propTypes = {
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
