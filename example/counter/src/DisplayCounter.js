import React, { Component } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CounterState } from "./CounterState";

export default class DisplayCounter extends Component {
  constructor(props) {
    super(props);
    CounterState.register(this, "counter");
  }

  componentWillUnmount() {
    CounterState.unregister(this);
  }

  render() {
    const { counter } = CounterState.getState();

    return (
      <View style={styles.container}>
        <Text>{counter}</Text>
      </View>
    );
  }
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
