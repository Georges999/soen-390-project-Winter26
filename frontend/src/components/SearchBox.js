import React from "react";
import { View, Text, Pressable, TextInput, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function SearchBox({
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
    </View>
  );
}
