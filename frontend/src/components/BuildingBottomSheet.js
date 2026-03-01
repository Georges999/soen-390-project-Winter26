import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

export default function BuildingBottomSheet({
  styles,
  maroon,
  selectedBuilding,
  getBuildingName,
  getAmenities,
  onClose,
  onDirections,
}) {
  if (!selectedBuilding) return null;

  const a = getAmenities(selectedBuilding);

  return (
    <View style={styles.sheetWrap} pointerEvents="box-none">
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetHeaderLeft}>
            <View style={styles.buildingIcon}>
              <Image
                source={require("../../assets/Clogo.png")}
                style={styles.buildingIconImage}
                resizeMode="contain"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.buildingTitle} numberOfLines={1}>
                {getBuildingName(selectedBuilding).toUpperCase()}
              </Text>

              {selectedBuilding.address ? (
                <Text style={styles.buildingSub} numberOfLines={2}>
                  {selectedBuilding.address}
                </Text>
              ) : (
                <Text style={styles.buildingSub} numberOfLines={2}>
                  No address available
                </Text>
              )}

              <View style={styles.amenitiesWrap}>
                <Text style={styles.amenitiesTitle}>Amenities</Text>

                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="wc" size={16} color={maroon} />
                    <Text style={styles.amenityLabel}>Bathrooms</Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.bathrooms ? "Available" : "Not available"}
                  </Text>
                </View>

                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="water-drop" size={16} color={maroon} />
                    <Text style={styles.amenityLabel}>Water fountains</Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.waterFountains ? "Available" : "Not available"}
                  </Text>
                </View>

                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="wc" size={16} color={maroon} />
                    <Text style={styles.amenityLabel}>
                      Gender-neutral bathrooms
                    </Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.genderNeutralBathrooms ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="accessible" size={16} color={maroon} />
                    <Text style={styles.amenityLabel}>
                      Wheelchair accessible
                    </Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.wheelchairAccessible ? "Yes" : "No"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        <Pressable style={styles.directionsBtn} onPress={onDirections}>
          <Image
            source={require("../../assets/directionsLogo.png")}
            style={styles.directionsBtnIcon}
            resizeMode="contain"
          />
          <Text style={styles.directionsBtnText}>Directions</Text>
        </Pressable>
      </View>
    </View>
  );
}

BuildingBottomSheet.propTypes = {
  styles: PropTypes.shape({
    sheetWrap: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    sheet: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    sheetHandle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    sheetHeaderRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    sheetHeaderLeft: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    buildingIcon: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    buildingIconImage: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    buildingTitle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    buildingSub: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    amenitiesWrap: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    amenitiesTitle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    amenityRow: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    amenityLeft: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    amenityLabel: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    amenityValue: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    closeBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    closeBtnText: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    directionsBtn: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    directionsBtnIcon: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    directionsBtnText: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  }).isRequired,
  maroon: PropTypes.string.isRequired,
  selectedBuilding: PropTypes.shape({
    address: PropTypes.string,
  }),
  getBuildingName: PropTypes.func.isRequired,
  getAmenities: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onDirections: PropTypes.func.isRequired,
};
