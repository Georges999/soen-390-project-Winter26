import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

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
  return (
    <View style={styles.directionsWrap} pointerEvents="box-none">
      <View style={styles.directionsPanel}>
        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeBtn, travelMode === "driving" && styles.modeBtnActive]}
            onPress={() => setTravelMode("driving")}
          >
            <MaterialIcons
              name="directions-car"
              size={18}
              color={travelMode === "driving" ? maroon : "#111"}
            />
            <Text
              style={[
                styles.modeBtnLabel,
                travelMode === "driving" && styles.modeBtnTextActive,
              ]}
            >
              Car
            </Text>
          </Pressable>

          <Pressable
            style={[styles.modeBtn, travelMode === "walking" && styles.modeBtnActive]}
            onPress={() => setTravelMode("walking")}
          >
            <MaterialIcons
              name="directions-walk"
              size={18}
              color={travelMode === "walking" ? maroon : "#111"}
            />
            <Text
              style={[
                styles.modeBtnLabel,
                travelMode === "walking" && styles.modeBtnTextActive,
              ]}
            >
              Walk
            </Text>
          </Pressable>

          <Pressable
            style={[styles.modeBtn, travelMode === "bicycling" && styles.modeBtnActive]}
            onPress={() => setTravelMode("bicycling")}
          >
            <MaterialIcons
              name="directions-bike"
              size={18}
              color={travelMode === "bicycling" ? maroon : "#111"}
            />
            <Text
              style={[
                styles.modeBtnLabel,
                travelMode === "bicycling" && styles.modeBtnTextActive,
              ]}
            >
              Bike
            </Text>
          </Pressable>

          {isCrossCampusTrip && (
            <Pressable
              style={[styles.modeBtn, travelMode === "transit" && styles.modeBtnActive]}
              onPress={() => setTravelMode("transit")}
            >
              <MaterialIcons
                name="directions-transit"
                size={18}
                color={travelMode === "transit" ? maroon : "#111"}
              />
              <Text
                style={[
                  styles.modeBtnLabel,
                  travelMode === "transit" && styles.modeBtnTextActive,
                ]}
              >
                Transit
              </Text>
            </Pressable>
          )}
        </View>

        {travelMode === "transit" && isCrossCampusTrip && (
          <View style={styles.shuttlePanel}>
            <View style={styles.transitSubRow}>
              <Pressable
                style={[
                  styles.transitSubBtn,
                  transitSubMode === "shuttle" && styles.transitSubBtnActive,
                ]}
                onPress={() => {
                  setTransitSubMode("shuttle");
                  setIsShuttleModalOpen(true);
                }}
              >
                <Text
                  style={[
                    styles.transitSubText,
                    transitSubMode === "shuttle" && styles.transitSubTextActive,
                  ]}
                >
                  Shuttle
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.transitSubBtn,
                  transitSubMode === "public" && styles.transitSubBtnActive,
                ]}
                onPress={() => setTransitSubMode("public")}
              >
                <Text
                  style={[
                    styles.transitSubText,
                    transitSubMode === "public" && styles.transitSubTextActive,
                  ]}
                >
                  Public
                </Text>
              </Pressable>
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
                                {opt.durationValue && isFinite(opt.durationValue)
                                  ? ` (ETA ${(() => {
                                      const now = new Date();
                                      const mins = Math.round(opt.durationValue / 60);
                                      const eta = new Date(now.getTime() + mins * 60000);
                                      const hh = eta.getHours().toString().padStart(2, "0");
                                      const mm = eta.getMinutes().toString().padStart(2, "0");
                                      return `${hh}:${mm}`;
                                    })()})`
                                  : ""}
                              </Text>
                            </View>
                            <Text style={styles.transitStops}>Tap to view details</Text>
                            {isSelected && routeInfo?.steps?.length > 0 && (
                              <View style={styles.transitSteps}>
                                {routeInfo.steps.map((step, stepIdx) => {
                                  const mode = step.travelMode;
                                  let icon = "directions-walk";
                                  if (mode === "TRANSIT") {
                                    const vehicle = step.transitDetails?.vehicleType || "";
                                    icon = vehicle === "SUBWAY" ? "subway" : "directions-bus";
                                  }
                                  return (
                                    <View key={`step-${stepIdx}`} style={styles.transitStepRow}>
                                      <MaterialIcons name={icon} size={16} color="#111" />
                                      <Text style={styles.transitStepText}>
                                        {step.transitDetails?.lineShortName ||
                                          step.transitDetails?.lineName ||
                                          stripHtml(step.instruction || "")}
                                        {step.travelMode === "TRANSIT" && (
                                          <>
                                            {step.transitDetails?.arrivalStop && (
                                              <Text style={styles.transitStopName}>
                                                {" "}
                                                ({step.transitDetails.arrivalStop})
                                              </Text>
                                            )}
                                            {step.transitDetails?.numStops != null && (
                                              <Text style={styles.transitStopCount}>
                                                {" "}
                                                • {step.transitDetails.numStops} stops
                                              </Text>
                                            )}
                                          </>
                                        )}
                                      </Text>
                                    </View>
                                  );
                                })}
                              </View>
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

            <Pressable style={styles.goBtn} onPress={onGo}>
              <Text style={styles.goBtnText}>GO</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
