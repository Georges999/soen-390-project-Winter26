import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

const MAROON = "#95223D";

export default function BuildingBottomSheet({
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
                    <MaterialIcons name="wc" size={16} color={MAROON} />
                    <Text style={styles.amenityLabel}>Bathrooms</Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.bathrooms ? "Available" : "Not available"}
                  </Text>
                </View>

                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="water-drop" size={16} color={MAROON} />
                    <Text style={styles.amenityLabel}>Water fountains</Text>
                  </View>
                  <Text style={styles.amenityValue}>
                    {a.waterFountains ? "Available" : "Not available"}
                  </Text>
                </View>

                <View style={styles.amenityRow}>
                  <View style={styles.amenityLeft}>
                    <MaterialIcons name="wc" size={16} color={MAROON} />
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
                    <MaterialIcons name="accessible" size={16} color={MAROON} />
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

const styles = StyleSheet.create({
  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sheet: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E6E6E6",
    marginBottom: 12,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  sheetHeaderLeft: { flexDirection: "row", gap: 12, flex: 1, paddingRight: 8 },
  buildingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MAROON,
    alignItems: "center",
    justifyContent: "center",
  },
  buildingIconImage: { width: 28, height: 28 },
  buildingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    letterSpacing: 0.4,
  },
  buildingSub: { marginTop: 4, fontSize: 13, color: "#666", lineHeight: 18 },
  amenitiesWrap: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
  },
  amenitiesTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  amenityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 10,
  },
  amenityLabel: {
    fontSize: 13,
    color: "#333",
    fontWeight: "700",
    flexShrink: 1,
  },
  amenityValue: {
    fontSize: 13,
    color: "#666",
    fontWeight: "800",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 16, color: "#333", fontWeight: "700" },
  directionsBtn: {
    marginTop: 16,
    backgroundColor: MAROON,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  directionsBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  directionsBtnIcon: { width: 18, height: 18 },
});

BuildingBottomSheet.propTypes = {
  selectedBuilding: PropTypes.shape({
    address: PropTypes.string,
  }),
  getBuildingName: PropTypes.func.isRequired,
  getAmenities: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onDirections: PropTypes.func.isRequired,
};
