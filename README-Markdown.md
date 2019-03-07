# React Native Shared State

A simple, light weight react native global state manager, packed with cool features.

---

Having looked at redux and ran away tail between my leg I decided to create a much more simple way of managing state across components.

**Shared State** offers a unique approach, more inline with the way state is managed within a component... making it much easier to learn!

### List of features

- Create one (or even multiple) state objects that can be shared between multiple components.
- Have any part of your code update the shared state.
- Register components so that they automatically rerender when selected state properties change.
- Enforce data validation on state properties to prevent accidental state corruption.
- Persist state between sessions.

### Download & Installation

```shell
$ npm install react-native-shared-state
```

### Code Demo

The following is a simple demo of **Shared State**'s most basic functions. It will walkthrough the creation of a step counter, using a diplay counter component and increase button component.

_Note: this problem would be better suited to using local state but provides a clean overview of **Shared State**'s capabilities._

#

Create a shared state

```html We will use markdown for the Syntax Highlighting
import SharedState from "react-native-shared-state"; export const CounterState =
new SharedState({ counter: 0 });
```

\*Yes, it is that easy to create a shared state with

#

Create the counter display

```html We will use markdown for the Syntax Highlighting
export default class DisplayCounter extends Component { constructor(props) {
super(props); CounterState.register(this, "counter"); } componentWillUnmount() {
CounterState.unregister(this); } render() { const { counter } =
CounterState.getState(); return (
<View style="{styles.container}">
  <Text>{counter}</Text>
</View>
); } }
```

_By registering the component with key "counter", the component will re-render whenever CounterState's counter property changes._

_All registered components need to unregister on unmounting to remove event listeners and avoid memory leaks._

_CounterState's properties can be cleanly destructured from it's getState method. Since this is fetched on each render it is alway up to date._

#

Create the increase button

```html We will use markdown for the Syntax Highlighting
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
```

_Again, by destructuring getState we have easy access to state properties._

_Setting state will overwrite current property causing all components registered to the property to re-render_

### Contributing

Keep it simple. Keep it minimal. Don't put every single feature just because you can.

### Authors or Acknowledgments

- Jonti Hudson

### License

This project is licensed under the MIT License
