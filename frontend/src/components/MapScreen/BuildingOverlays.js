import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { View, Text } from "react-native";
import { Marker, Polygon } from "react-native-maps";
import { getPolygonCenter } from "../../utils/geoUtils";

/**
 * Pure presentation component for building overlays
 * Renders all building polygons, labels, and POI markers on the map
 * Receives campus data and callback handlers as props
 */
function BuildingOverlays({
  selectedCampusId,
  selectedCampus,
  otherCampuses,
  showCampusLabels,
  campusList,
  isCurrentBuilding,
  getBuildingName,
  displayedPOIs,
  onBuildingPress,
  onPoiPress,
  styles,
}) {
  // Memoize campus label calculation to avoid unnecessary renders
  const shouldShowBuildingLabels = useMemo(() => {
    return !showCampusLabels;
  }, [showCampusLabels]);

  if (!selectedCampus) return null;

  return (
    <>
      {/* Selected campus buildings */}
      {selectedCampus.buildings.map((building) => {
        const center = getPolygonCenter(building.coordinates);
        const label = building.label || building.name;

        return (
          <React.Fragment key={building.id}>
            <Polygon
              testID={`building-${building.id}`}
              coordinates={building.coordinates}
              fillColor={
                isCurrentBuilding(selectedCampus.id, building)
                  ? "rgba(37, 99, 235, 0.35)"
                  : "rgba(149, 34, 61, 0.25)"
              }
              strokeColor={
                isCurrentBuilding(selectedCampus.id, building)
                  ? "rgba(37, 99, 235, 0.95)"
                  : "rgba(149, 34, 61, 0.9)"
              }
              strokeWidth={2}
              tappable
              onPress={() => onBuildingPress(building)}
            />

            {shouldShowBuildingLabels && center && label ? (
              <Marker
                coordinate={center}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
                pointerEvents="none"
              >
                <View style={styles.buildingLabel}>
                  <Text style={styles.buildingLabelText}>{label}</Text>
                </View>
              </Marker>
            ) : null}
          </React.Fragment>
        );
      })}

      {/* Other campus buildings */}
      {otherCampuses.map((campus) =>
        campus.buildings.map((building) => {
          const center = getPolygonCenter(building.coordinates);
          const label = building.label || building.name;
          const key = `${campus.id}-${building.id}`;

          return (
            <React.Fragment key={key}>
              <Polygon
                testID={`building-${campus.id}-${building.id}`}
                coordinates={building.coordinates}
                fillColor={
                  isCurrentBuilding(campus.id, building)
                    ? "rgba(37, 99, 235, 0.2)"
                    : "rgba(149, 34, 61, 0.10)"
                }
                strokeColor={
                  isCurrentBuilding(campus.id, building)
                    ? "rgba(37, 99, 235, 0.85)"
                    : "rgba(149, 34, 61, 0.55)"
                }
                strokeWidth={2}
                tappable
                onPress={() => onBuildingPress(building)}
              />

              {shouldShowBuildingLabels && center && label ? (
                <Marker
                  coordinate={center}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                  pointerEvents="none"
                >
                  <View style={styles.buildingLabel}>
                    <Text style={styles.buildingLabelText}>{label}</Text>
                  </View>
                </Marker>
              ) : null}
            </React.Fragment>
          );
        }),
      )}

      {/* Campus labels when zoomed out */}
      {showCampusLabels &&
        campusList.map((campus) => (
          <Marker
            key={`campus-label-${campus.id}`}
            coordinate={{
              latitude: campus.region.latitude,
              longitude: campus.region.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            pointerEvents="none"
          >
            <View style={styles.campusLabel}>
              <Text style={styles.campusLabelText}>
                {campus.id === "sgw" ? "SGW" : "Loyola"}
              </Text>
            </View>
          </Marker>
        ))}

      {/* POI markers */}
      {displayedPOIs.map((poi, idx) => (
        <Marker
          key={`poi-mkr-${String(poi.id ?? idx)}-${idx}`}
          coordinate={poi.coords}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => onPoiPress(poi)}
          testID="poi-marker"
        >
          <View style={styles.poiMarker} collapsable={false} />
        </Marker>
      ))}
    </>
  );
}

BuildingOverlays.propTypes = {
  selectedCampusId: PropTypes.string,
  selectedCampus: PropTypes.shape({
    id: PropTypes.string.isRequired,
    buildings: PropTypes.array.isRequired,
  }),
  otherCampuses: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      buildings: PropTypes.array.isRequired,
    }),
  ).isRequired,
  showCampusLabels: PropTypes.bool.isRequired,
  campusList: PropTypes.array.isRequired,
  isCurrentBuilding: PropTypes.func.isRequired,
  getBuildingName: PropTypes.func.isRequired,
  displayedPOIs: PropTypes.array.isRequired,
  onBuildingPress: PropTypes.func.isRequired,
  onPoiPress: PropTypes.func.isRequired,
  styles: PropTypes.object.isRequired,
};

export default React.memo(BuildingOverlays);
