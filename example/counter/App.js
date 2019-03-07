import React, { Component } from "react";
import { StyleSheet, View } from "react-native";

import DisplayCounter from "./src/DisplayCounter";
import DecreaseCounter from "./src/DecreaseCounter";
import IncreaseCounter from "./src/IncreaseCounter";

export default class App extends Component {
  render() {
    return (
      <View style={styles.container}>
        <DecreaseCounter />
        <DisplayCounter />
        <IncreaseCounter />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF"
  }
});
