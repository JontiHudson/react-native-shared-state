import React, { Component } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import AnimationWrapper from "react-native-animation-wrapper";

export default class App extends Component {
  constructor(props) {
    super(props);

    this.state = { animate: null };
  }

  onPress() {
    const { animate } = this.state;
    console.log("onPress");

    if (animate !== "go") {
      this.setState({ animate: "go" });
    } else {
      this.setState({ animate: "return" });
    }
  }

  render() {
    const { animate } = this.state;

    console.log(animate);

    return (
      <View style={styles.container}>
        <AnimationWrapper
          style={styles.animation}
          animate={animate}
          animations={animations}
        />
        <TouchableOpacity style={styles.button} onPress={() => this.onPress()}>
          <Text>Animate</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  animation: {
    height: 100,
    width: 100,
    backgroundColor: "red"
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF"
  },
  button: {
    position: "absolute",
    padding: 10,
    bottom: 50,
    backgroundColor: "lightgrey"
  }
});

const animations = {
  go: {
    height: {
      startValue: 0,
      endValue: 300,
      duration: 5000,
      delay: 0
    },
    opacity: {
      startValue: 0,
      endValue: 1,
      duration: 5000,
      delay: 0
    }
  },
  return: {
    height: {
      startValue: 300,
      endValue: 0,
      duration: 5000,
      delay: 0
    },
    opacity: {
      startValue: 1,
      endValue: 0,
      duration: 5000,
      delay: 0
    }
  }
};
