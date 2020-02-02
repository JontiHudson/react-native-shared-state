import { SharedState } from 'react-native-shared-state';

export const CounterState = new SharedState({ counter: 5 });

CounterState.increase = function() {
  const { counter } = CounterState.state;
  CounterState.setState({ counter: counter + 1 });
};
