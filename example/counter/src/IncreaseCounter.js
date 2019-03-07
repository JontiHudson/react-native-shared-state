import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { CounterState } from "./CounterState";

export default class IncreaseCounter extends Component {
  increaseCounter() {
    const { counter } = CounterState.getState();
    CounterState.setState({ counter: counter + 1 });
  }

  render() {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => this.increaseCounter()}
      >
        <Text>+</Text>
      </TouchableOpacity>
    );
  }
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
