import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SharedState } from 'react-native-shared-state';

const CounterState = new SharedState(
  {
    counter1: 0,
  },
  { debugMode: true },
);

const MultiCounterState = new SharedState(
  {
    counter2: 0,
    counter3: 0,
  },
  { debugMode: true },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { paddingTop: 20 },
});

export default function App() {
  const [{ counter1 }, setCounter1State] = CounterState.useState('counter1');

  CounterState.useStorage({
    storeName: 'CounterState',
    saveOnBackground: true,
    encryptionKey: 'fafafsafaasf',
  });

  const [
    { counter2, counter3 },
    setCounter2State,
  ] = MultiCounterState.useState(['counter2', 'counter3']);

  MultiCounterState.useStorage({
    storeName: 'MultiCounterState',
  });

  return (
    <View style={styles.container}>
      <Text>{counter1}</Text>
      <TouchableOpacity
        onPress={() => {
          setCounter1State({ counter1: counter1 + 1 });
        }}
      >
        <Text style={styles.text}>update Count 1</Text>
      </TouchableOpacity>

      <Text style={styles.text}>{counter2}</Text>
      <TouchableOpacity
        onPress={() => {
          setCounter2State({ counter2: counter2 + 1 });
        }}
      >
        <Text style={styles.text}>update Count 2</Text>
      </TouchableOpacity>

      <Text style={styles.text}>{counter3}</Text>
      <TouchableOpacity
        onPress={() => {
          setCounter2State({ counter3: counter3 + 1 });
        }}
      >
        <Text style={styles.text}>update Count 3</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          CounterState.save();
          MultiCounterState.save();
        }}
      >
        <Text style={styles.text}>Save</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          CounterState.reset();
          MultiCounterState.reset();
        }}
      >
        <Text style={styles.text}>Reset</Text>
      </TouchableOpacity>
    </View>
  );
}
