import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { CounterState } from "./CounterState";

export default function DecreaseCounter() {
  function decreaseCounter() {
    const { counter } = CounterState.state;
    CounterState.setState({ counter: counter - 1 });
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => decreaseCounter()}
    >
      <Text>-</Text>
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
