import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

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
                    <Text style={styles.amenityLabel}>Gender-neutral bathrooms</Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.genderNeutralBathrooms ? "Yes" : "No"}
                  </Text>
                </View>
                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="accessible" size={16} color={maroon} />
                    <Text style={styles.amenityLabel}>Wheelchair accessible</Text>
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
