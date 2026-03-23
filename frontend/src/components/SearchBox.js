import React from "react";
import { View, Text, Pressable, TextInput, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import PropTypes from "prop-types";

function SearchBox({
  styles,
  startText,
  destText,
  activeField,
  searchResults,
  shouldShowMyLocationOption,
  getBuildingKey,
  getBuildingName,
  onStartChange,
  onDestChange,
  onStartFocus,
  onDestFocus,
  onClearStart,
  onClearDest,
  onSwap,
  onSelectMyLocation,
  onSelectBuilding,
}) {
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
        <MaterialIcons name="swap-vert" size={18} color="#95223D" />
      </Pressable>

      {(shouldShowMyLocationOption || searchResults.length > 0) && (
        <View style={styles.searchResults}>
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
        </View>
      )}

      {/* Show "not found" message when searching for invalid buildings */}
      {activeField && (activeField === "start" ? startText : destText).trim().length > 0 && !shouldShowMyLocationOption && searchResults.length === 0 && (
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

const stylePropType = PropTypes.oneOfType([
  PropTypes.object,
  PropTypes.array,
  PropTypes.number,
]);

SearchBox.propTypes = {
  styles: PropTypes.shape({
    redBox: stylePropType,
    inputRow: stylePropType,
    searchIcon: stylePropType,
    input: stylePropType,
    inputPlaceholder: stylePropType,
    clearBtn: stylePropType,
    clearBtnText: stylePropType,
    swapBtn: stylePropType,
    searchResults: stylePropType,
    searchResultRow: stylePropType,
    searchResultText: stylePropType,
    noResultsContainer: stylePropType,
    noResultsText: stylePropType,
  }).isRequired,
  startText: PropTypes.string.isRequired,
  destText: PropTypes.string.isRequired,
  activeField: PropTypes.string,
  searchResults: PropTypes.arrayOf(PropTypes.object).isRequired,
  shouldShowMyLocationOption: PropTypes.bool.isRequired,
  getBuildingKey: PropTypes.func.isRequired,
  getBuildingName: PropTypes.func.isRequired,
  onStartChange: PropTypes.func.isRequired,
  onDestChange: PropTypes.func.isRequired,
  onStartFocus: PropTypes.func.isRequired,
  onDestFocus: PropTypes.func.isRequired,
  onClearStart: PropTypes.func.isRequired,
  onClearDest: PropTypes.func.isRequired,
  onSwap: PropTypes.func.isRequired,
  onSelectMyLocation: PropTypes.func.isRequired,
  onSelectBuilding: PropTypes.func.isRequired,
};

export default SearchBox;
