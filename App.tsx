import "react-native-gesture-handler";
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import GroupSTA from "./src/screens/GroupSTA";

export type RootStackParamList = {
  Home: undefined;
  GroupSTA: undefined;
  LogsSTA: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Navigator initialRouteName="GroupSTA">
          <Stack.Screen name="GroupSTA" component={GroupSTA} options={{ title: "Group STA v1" }} />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
