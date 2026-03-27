import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import MapScreen from "../screens/MapScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CalendarScreen from "../screens/CalendarScreen";
import NextClassScreen from "../screens/NextClassScreen";
import IndoorMapScreen from "../screens/IndoorMapScreen";
import IndoorDirectionsScreen from "../screens/IndoorDirectionsScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MAROON = "#95223D";

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="Calendar" component={CalendarScreen} />
    </Stack.Navigator>
  );
}

function IndoorStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="IndoorMap" component={IndoorMapScreen} />
      <Stack.Screen name="IndoorDirections" component={IndoorDirectionsScreen} />
    </Stack.Navigator>
  );
}

const TAB_SCREENS = [
  {
    name: "Map",
    component: MapScreen,
    testID: "tab-map",
    label: "Map",
    icon: "map",
  },
  {
    name: "NextClass",
    component: NextClassScreen,
    testID: "tab-next-class",
    label: "Next Class",
    icon: "event",
  },
  {
    name: "Indoor",
    component: IndoorStack,
    testID: "tab-indoor",
    label: "Indoor",
    icon: "domain",
  },
  {
    name: "Profile",
    component: ProfileStack,
    testID: "tab-profile",
    label: "Profile",
    icon: "person",
  },
];

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: MAROON,
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          height: 70,
          paddingBottom: 10,
          paddingTop: 5,
          borderTopWidth: 1,
          borderTopColor: "#E0E0E0",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      {TAB_SCREENS.map((tab) => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{
            tabBarTestID: tab.testID,
            tabBarAccessibilityLabel: tab.testID,
            tabBarLabel: tab.label,
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name={tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
