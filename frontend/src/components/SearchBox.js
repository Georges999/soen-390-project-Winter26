import React from "react";
import { View, Text, Pressable, TextInput, Image, ScrollView, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

const MAROON = "#95223D";

function SearchBox({
  startText,
  destText,
  activeField,
  searchResults,
  roomResults,
  shouldShowMyLocationOption,
  getBuildingKey,
  getBuildingName,
  getRoomKey,
  getRoomLabel,
  onStartChange,
  onDestChange,
  onStartFocus,
  onDestFocus,
  onClearStart,
  onClearDest,
  onSwap,
  onSelectMyLocation,
  onSelectBuilding,
  onSelectRoom,
}) {
  const hasSuggestions =
    shouldShowMyLocationOption ||
    searchResults.length > 0 ||
    roomResults.length > 0;

  return (
    <View style={styles.redBox}>
      <View style={styles.inputRow}>
        <Image
          source={require("../../assets/magnifier.png")}
          style={styles.searchIcon}
          resizeMode="contain"
        />
        <TextInput
          testID="start-input"
          value={startText}
          onChangeText={onStartChange}
          placeholder="Search or click on a building..."
          placeholderTextColor="#EED7DE"
          style={[styles.input, !startText && styles.inputPlaceholder]}
          onFocus={onStartFocus}
        />
        {startText.length > 0 && (
          <Pressable onPress={onClearStart} hitSlop={10} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.inputRow, { marginBottom: 0 }]}>
        <Image
          source={require("../../assets/magnifier.png")}
          style={styles.searchIcon}
          resizeMode="contain"
        />
        <TextInput
          testID="dest-input"
          value={destText}
          onChangeText={onDestChange}
          placeholder="Search or click on a building..."
          placeholderTextColor="#EED7DE"
          style={[styles.input, !destText && styles.inputPlaceholder]}
          onFocus={onDestFocus}
        />
        {destText.length > 0 && (
          <Pressable onPress={onClearDest} hitSlop={10} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.swapBtn} onPress={onSwap}>
        <MaterialIcons name="swap-vert" size={18} color={MAROON} />
      </Pressable>

      {hasSuggestions && (
        <ScrollView
          style={styles.searchResults}
          contentContainerStyle={styles.searchResultsScroll}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {shouldShowMyLocationOption && (
            <Pressable
              onPress={() => onSelectMyLocation(activeField)}
              style={styles.searchResultRow}
            >
              <Text style={styles.searchResultText}>My location</Text>
            </Pressable>
          )}
          {searchResults.map((building) => (
            <Pressable
              key={getBuildingKey(building.__campusId, building)}
              onPress={() => onSelectBuilding(building, activeField)}
              style={styles.searchResultRow}
            >
              <Text style={styles.searchResultText}>{getBuildingName(building)}</Text>
            </Pressable>
          ))}
          {roomResults.length > 0 && (
            <>
              <Text style={styles.searchSectionLabel}>Room matches</Text>
              {roomResults.map((room) => (
                <Pressable
                  key={getRoomKey(room)}
                  onPress={() => onSelectRoom(room, activeField)}
                  style={styles.searchResultRow}
                >
                  <Text style={styles.searchResultText}>{getRoomLabel(room)}</Text>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Show "not found" message when searching for invalid buildings */}
      {activeField &&
      (activeField === "start" ? startText : destText).trim().length > 0 &&
      !shouldShowMyLocationOption &&
      searchResults.length === 0 &&
      roomResults.length === 0 && (
        <View style={styles.noResultsContainer}>
          <MaterialIcons name="search-off" size={24} color="#999" />
          <Text style={styles.noResultsText}>
            No buildings found. Please try again.
          </Text>
        </View>
      )}
    </View>
  );
}

SearchBox.propTypes = {
  startText: PropTypes.string.isRequired,
  destText: PropTypes.string.isRequired,
  activeField: PropTypes.string,
  searchResults: PropTypes.arrayOf(PropTypes.object).isRequired,
  roomResults: PropTypes.arrayOf(PropTypes.object).isRequired,
  shouldShowMyLocationOption: PropTypes.bool.isRequired,
  getBuildingKey: PropTypes.func.isRequired,
  getBuildingName: PropTypes.func.isRequired,
  getRoomKey: PropTypes.func.isRequired,
  getRoomLabel: PropTypes.func.isRequired,
  onStartChange: PropTypes.func.isRequired,
  onDestChange: PropTypes.func.isRequired,
  onStartFocus: PropTypes.func.isRequired,
  onDestFocus: PropTypes.func.isRequired,
  onClearStart: PropTypes.func.isRequired,
  onClearDest: PropTypes.func.isRequired,
  onSwap: PropTypes.func.isRequired,
  onSelectMyLocation: PropTypes.func.isRequired,
  onSelectBuilding: PropTypes.func.isRequired,
  onSelectRoom: PropTypes.func.isRequired,
};

const styles = StyleSheet.create({
  redBox: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    zIndex: 50,
    backgroundColor: MAROON,
    borderRadius: 22,
    padding: 12,
  },
  inputRow: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0,
    flex: 1,
  },
  searchIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    opacity: 0.8,
  },
  inputPlaceholder: {
    fontSize: 12,
    fontStyle: "italic",
    fontWeight: "500",
  },
  searchResults: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    maxHeight: 240,
  },
  searchResultsScroll: {
    overflow: "hidden",
  },
  searchResultRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },
  searchResultText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  searchSectionLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
    textTransform: "uppercase",
  },
  noResultsContainer: {
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  noResultsText: {
    marginTop: 8,
    fontSize: 14,
    color: "#fff",
    textAlign: "center",
    opacity: 0.8,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  clearBtnText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  swapBtn: {
    position: "absolute",
    right: 350,
    top: 47,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});

export default SearchBox;
