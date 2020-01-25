import React, { Component } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CounterState } from "./CounterState";

export default function DisplayCounter() {
  const [counter] = CounterState.useState("counter");

  return (
    <View style={styles.container}>
      <Text>{counter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 5,
    borderWidth: 1,
    margin: 10,
    width: 80
  }
});
