import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

import { CounterState } from "./CounterState";

export default class DecreaseCounter extends Component {
  decreaseCounter() {
    CounterState.setState({ counter: currentValue => currentValue - 1 });
  }

  render() {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => this.decreaseCounter()}
      >
        <Text>-</Text>
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
