# React Native Shared State

A simple, light weight react native global state manager, packed with cool features.

**Now uses hooks as well!!!**

_Note: Version 0.3.0 onwards requires react native version 0.59.0 onwards, earier versions will still work with 0.2.0_

---

Having looked at redux and ran away tail between my legs I decided to create a much more simple way of managing state across components.

**Shared State** offers a unique approach, more inline with the way state is managed within a component... making it much easier to learn!

### List of features

- Create one (or even multiple) state objects that can be shared between multiple components.
- Have any part of your code update the shared state.
- Register components so that they automatically re-render when selected state properties change.
- Enforce data validation on state properties to prevent accidental state corruption.
- Persist state between sessions.

---

## Download & Installation

```shell
$ npm install react-native-shared-state
```

---

## Code Demo

The following is a simple demo of **Shared State**'s most basic functions. It will walkthrough the creation of a step counter, using a diplay counter component and increase button component.

_Note: this problem would be better suited to using local state but provides a clean overview of **Shared State**'s capabilities._

#

Create a shared state

```
import SharedState from "react-native-shared-state";

export const CounterState = new SharedState({
  counter: 0
});
```

_Yes, it's that easy to create a shared state with default values_

#

Create the counter display

```
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
      <View>
        <Text>{counter}</Text>
      </View>
    );
  }
}
```

_By registering the component with key "counter", the component will re-render whenever CounterState's counter property changes._

_All registered components need to unregister on unmounting to remove event listeners and avoid memory leaks._

_CounterState's properties can be cleanly destructured from it's getState method. Since this is fetched on each render it is alway up to date._

#

Create the increase button

```
export default class IncreaseCounter extends Component {
  increaseCounter() {
    const { counter } = CounterState.getState();
    CounterState.setState({ counter: counter + 1 });
  }

  render() {
    return (
      <TouchableOpacity
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

---

## Guide

### Shared State Construction

To start using shared states first import the class **SharedState** from your _node_modules_.

Create a new instance of the **SharedState** class with the name of your shared state. (This could be a global state, or a more specific shared state as seen later on.)

```
const ExampleState = SharedState(defaultState: object, ?{validator: ?object, debugMode: ?boolean});
```

_defaultState - An object of key/value pairs that will be the initial state and the state which the share state will return to on reset(). Note: state values can be all types except functions._

_validator (optional) - An object with where values are the datatypes required in string form (see using validation)._

_debugMode (optional) - Provides console logging of internal processes to aid debugging._

#

### Registering Components

React components will only re-render if they are registered with the shared state. To do this use the **register()** method. Registration should occur either in the _constructor_ or _componentDidMount_.

```
ExampleState.register(this: React.Component, keys: string | Array<string>);
```

_this - Use 'this' to pass the react component itself into the **shared state**._

_keys - The **shared state**'s property/properties that you wish the react component to re-render when updated._

#

### Unregistering Components

All registered components need to **unregister()** before they are unmounted to remove listeners and prevent memory leaks. This is best done in _componentWillUnmount_.

```
ExampleState.unregister(this: React.Component);
```

_this - Use 'this' to pass the react component itself into the **shared state**._

#

### Getting state properties

The **getState()** method returns the current state.

```
const { exampleProp } = ExampleState.getState();
```

_Using object destructuring allows quick and clean access to state properties._

#

### Setting state properties

Like react components, **shared states** are updated using the **setState()** method, which accepts a partial state, updating corresponding state values. Note: an error will occur here if data validation fails (see data validation below).

```
ExampleState.setState(partialState: object);
```

_partialState - An object of key/value pairs. Functions can be used as values to manipulate current property values (see setting with functions below)._

#

### Reset Properties

State can be easily returned to its default state using the **reset()** method.

```
ExampleState.reset();
```

#

### Using Hooks

With react native version 0.59.0 we can now use hooks! This allows us to write components much more elegantly as functions. The **useState(_propName_)** utilises the power of hooks to re-render the function on property change. Now it can be done in a single line.

```
export default function DisplayCounter(props) {
  const [counter] = CounterState.useState('counter');

  return (
    <View>
      <Text>{counter}</Text>
    </View>
  );
}
```

---

## Advanced Features

### Persist Data

**Shared State** uses react native's _AsyncStorage_ to save the state between sessions. **useStorage()** loads the state from local storage and ensures the state is saved when the app closes. Since _AsyncStorage_ is asynchronous the method returns a promise, succeeding on set up.

```
await ExampleState.useStorage(storeName: string);
```

#

### Data Validation

To use validation, pass a validator object into the **SharedState** constructor. All data that is to be set in the state is passed through the validator.

```
const defaultState = {
  username: null,
  password: null,
  loggedIn: false,
  token: null
};

const validator = {
  username: ['null', 'string'],
  password: ['null', 'string'],
  loggedIn: 'boolean',
  token: ['null', {_id: 'string', expires: Date}]
};

const AuthState = SharedState(defaultState, { validator });

AuthState.setState({
  username: 'johndoe'
  password: 123456
});
// Fails

AuthState.setState({
  username: 'johndoe'
  password: '123456'
});
// Passes
```

Vaildator values should be either a string of the primitive type's name or a class, e.g. Date. Objects can be used to validate nested structure. If the value can be more than one type/schema use an array.

Note: Default state is also checked with the validator so make sure it is valid!

#

### Author

- Jonti Hudson

### License

This project is licensed under the MIT License
