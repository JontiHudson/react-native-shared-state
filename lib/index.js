import { useState, useEffect } from "react";
import { AppState, AsyncStorage } from "react-native";

export default class SharedState {
  static getError(code, ...arg) {
    const error = new Error(JSON.stringify({ code, ...arg }));

    console.error({ code, ...arg });
    return error;
  }

  constructor(defaultState, options) {
    const { debugMode, validator } = options || {};

    this._handleAppBackgrounded = this._handleAppBackgrounded.bind(this);

    // Validate default state
    try {
      if (defaultState && validator)
        this._validateState(defaultState, validator);
    } catch (err) {
      throw SharedState.getError(
        "CONSTRUCT_STATE_ERROR",
        err,
        defaultState,
        validator
      );
    }

    this._debugMode = debugMode;
    this._defaultState = defaultState;
    this._validator = validator;

    this._register = new Map();

    // Deep clone to prevent mutation of default state
    this.state = this._defaultState
      ? JSON.parse(JSON.stringify(this._defaultState))
      : {};
    // prevState will allow for componentShouldUpdate comparisons
    this.prevState = { ...this.state };

    this._debugger(this);
  }

  // UPDATE STATE
  setState(partialState, callback) {
    const updatedState = {};
    let updated = false;

    try {
      Object.keys(partialState).forEach(key => {
        // To reduce unwanted component re-renders only update props that have changed
        if (partialState[key] !== this.state[key]) {
          // Throws an error if prop fails validation
          if (this._validator) {
            this._validateProp(partialState[key], this._validator[key]);
          }

          // prevState updated
          this.prevState[key] = this.state[key];

          // state updated
          this.state[key] = partialState[key];

          // changed prop added to updatedState
          updatedState[key] = partialState[key];
          updated = true;
        }
      });

      // Only send if a change has occured
      if (updated) this._send(updatedState);
    } catch (err) {
      console.log(err);
      throw SharedState.getError("UPDATE_STATE_ERROR", err);
    }

    // optional callback once complete
    if (callback) callback();
  }

  _send(updatedState) {
    this._debugger({ send: updatedState });

    // Run update functions mapped to registered components
    this._register.forEach(onUpdate => {
      onUpdate(updatedState);
    });
  }

  reset() {
    this._debugger({ reset: this._defaultState });
    this.state = this._defaultState
      ? JSON.parse(JSON.stringify(this._defaultState))
      : {};
  }

  // VALIDATION
  _validateState(state, validator) {
    this._debugger({ state, validator });

    Object.keys(state).forEach(key => {
      this._validateProp(state[key], validator[key]);
    });
    return true;
  }

  _validateProp(prop, validator) {
    this._debugger({ prop, validator });

    // Prop validator can be a single type or an array of types
    if (Array.isArray(validator)) {
      const validatorLength = validator.length;
      for (let i = 0; i < validatorLength; i++) {
        if (this._isValid(prop, validator[i])) {
          return true;
        }
      }
    } else if (this._isValid(prop, validator)) {
      return true;
    }
    throw SharedState.getError("FAILED_VALIDATION", { prop, validator });
  }

  _isValid(prop, validatorElement) {
    if (prop === null && validatorElement === "null") {
      return true;
    }

    // Protects against NaN passing as a number
    if (isNaN(prop) && validatorElement === "number") {
      return false;
    }

    if (typeof prop === validatorElement) {
      return true;
    }

    if (typeof validatorElement === "object") {
      // Allows for object properties to be validated against instances
      try {
        if (prop instanceof validatorElement) {
          return true;
        }
      } catch (e) {}
      // Allows for use of object validators to validate nested props
      try {
        if (this._validateState(prop, validatorElement)) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  // REGISTRATION
  register(component, updateKeys) {
    this._debugger({ register: { component, updateKeys } });
    const id = Symbol("Shared State ID");

    // Allows for the use of single key or array of keys
    if (typeof updateKeys === "string") {
      updateKeys = [updateKeys];
    }

    function onUpdate(updatedState) {
      if (Object.keys(updatedState).some(key => updateKeys.includes(key))) {
        // By setting state with symbol it won't clash with any component state prop.
        // The update will cause the state to start the re-render cycle.

        component.setState({ [id]: updatedState });
        // component.forceUpdate();
      }
    }

    // By using a map, the component itself can be used as the key
    this._register.set(component, onUpdate);
  }

  unregister(component) {
    this._debugger({ unregister: { component } });

    // By deleting the component from the map, it is no longer included in any
    // further updates.
    this._register.delete(component);
  }

  // HOOKS
  useState(propKey) {
    // This will be used as the key for the update function on the registation map
    const id = Symbol("Hook ID");

    const [prop, setProp] = useState(this.state[propKey]);

    // Use effect will be only run onMount due to [] as second arg.
    useEffect(() => {
      this._registerHook(id, propKey, setProp);

      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterHook(id);
      };
    }, []);

    // setStateProp allows a quick way for function components to update the prop
    const setStateProp = value => {
      this.setState({ [propKey]: value });
    };

    return [prop, setStateProp];
  }

  _registerHook(id, propKey, setProp) {
    this._debugger({ registerHook: { id, propKey, setProp } });

    function onUpdate(updatedState) {
      if (Object.keys(updatedState).includes(propKey)) {
        setProp(updatedState[propKey]);
      }
    }

    this._register.set(id, onUpdate);
  }

  _unregisterHook(id) {
    this._debugger({ unregisterHook: { id } });

    this._register.delete(id);
  }

  // STORAGE PERSIST
  async useStorage(storeName) {
    // Function should only be run once
    if (this._asyncStoreName) {
      throw SharedState.getError(
        "STORAGE_ERROR",
        "Storage already initialised"
      );
    }

    try {
      this._asyncStoreName = storeName;

      // Starts listening to when the app's state changes
      AppState.addEventListener("change", this._handleAppBackgrounded);

      // Retrieves locally stored state
      const storedState = JSON.parse(await AsyncStorage.getItem(storeName));
      this._debugger({ storedState });

      // Initialises state from storage
      if (storedState) {
        this.setState(storedState);
        return true;
      }
    } catch (e) {
      SharedState.getError("STORAGE_ERROR", e);
      // Any errors cause the state to reset to defaultState
      this.reset();
    }
    return false;
  }

  _handleAppBackgrounded(nextAppState) {
    // When the app switches to background the current state is saved
    if (nextAppState === "background") {
      AsyncStorage.setItem(this._asyncStoreName, JSON.stringify(this.state));
      this._debugger(`Storing ${this._asyncStoreName || "undefined"}`);
    }
  }

  // DEBUGGING
  _debugger(log) {
    if (this._debugMode) console.log(log);
  }

  toString() {
    return JSON.stringify(this.state, null, 2);
  }
}
