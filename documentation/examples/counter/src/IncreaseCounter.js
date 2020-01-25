import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { CounterState } from "./CounterState";

export default function IncreaseCounter() {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => CounterState.increase}
    >
      <Text>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 5,
    borderWidth: 1,
    margin: 10,
    width: 40
  }
});
