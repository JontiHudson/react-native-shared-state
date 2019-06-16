// @flow

// $FlowFixMe
import { useState, useEffect } from "react";
// $FlowFixMe
import { AppState, AsyncStorage } from "react-native";

import CryptoJS from "react-native-crypto-js";

import type {
  ValidatorType,
  ComponentType,
  ComparerType,
  AllowFunctionType,
  OptionsType,
  SharedStateType
} from "../flow";

export const SharedState = class SharedState<StateType: Object>
  implements SharedStateType<StateType> {
  _asyncStoreName: ?string;
  _defaultState: StateType | {};
  _debugMode: ?boolean;
  _validator: ?ValidatorType;
  _register: Map<ComponentType | Symbol, (Object) => void>;
  _state: StateType;
  _prevState: StateType;
  _encryptionKey: ?string | false;
  _saveOnBackground: ?boolean;
  _handleAppBackgrounded: string => void;

  static getError(code: string, ...arg: Array<any>): Error {
    // $FlowFixMe
    const error = new Error(JSON.stringify({ code, ...arg }));
    // $FlowFixMe
    console.error({ code, ...arg });
    return error;
  }

  constructor(defaultState?: StateType, options: OptionsType = {}) {
    const { debugMode, validator } = options;

    this._handleAppBackgrounded = this._handleAppBackgrounded.bind(this);

    // Validate default state
    try {
      if (defaultState && validator)
        this._validateObject(defaultState, validator);
    } catch (err) {
      throw SharedState.getError(
        "CONSTRUCT_STATE_ERROR",
        err,
        defaultState,
        validator
      );
    }

    this._debugMode = debugMode;
    this._defaultState = defaultState || {};
    this._validator = validator;

    this._register = new Map();

    // Deep clone to prevent mutation of default state
    this._state = JSON.parse(JSON.stringify(this._defaultState));
    // prevState will allow for componentShouldUpdate comparisons
    this._prevState = { ...this._state };

    this._debugger(this);
  }

  // GETTERS AND SETTERS
  // Helps prevent state being mutated incorrectly.

  get state(): StateType {
    return this._state;
  }

  set state(object: any) {
    throw SharedState.getError("UPDATE_STATE_ERROR", {
      message:
        "State cannot be mutated directly, use the setState() method instead."
    });
  }

  get prevState(): StateType {
    return this._prevState;
  }

  set prevState(object: any) {
    throw SharedState.getError("UPDATE_PREV_STATE_ERROR", {
      message: "Prev state is read only."
    });
  }

  // UPDATE STATE
  setState(partialState: $Shape<StateType>, callback?: () => any) {
    const updatedState = {};
    let updated = false;

    try {
      Object.keys(partialState).forEach(key => {
        // To reduce unwanted component re-renders only update props that have changed
        if (partialState[key] !== this._state[key]) {
          // Throws an error if prop fails validation
          if (this._validator) {
            this._validateProp(partialState[key], this._validator[key]);
          }

          // prevState updated
          this._prevState[key] = this._state[key];

          // state updated
          this._state[key] = partialState[key];

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

  _send(updatedState: $Shape<StateType>) {
    this._debugger({ send: updatedState });

    // Run update functions mapped to registered components
    this._register.forEach((onUpdate: Object => void) => {
      onUpdate(updatedState);
    });
  }

  reset() {
    this._debugger({ reset: this._defaultState });

    // This will force update to all current state props even if not included in default state.
    const resetState = {};
    Object.keys(this._state).forEach((key: string) => {
      resetState[key] = undefined;
    });

    const defaultState = JSON.parse(JSON.stringify(this._defaultState));

    Object.assign(resetState, defaultState);

    const validator = this._validator;
    // Validator is skipped during reset
    this._validator = undefined;

    this.setState(resetState);
    this._validator = validator;

    if (this._asyncStoreName) {
      this.save();
    }
  }

  // VALIDATION
  _validateObject(object: Object, validator: ValidatorType) {
    this._debugger({ object, validator });

    const keys = Object.keys(validator);

    if (keys[0] === "_") {
      Object.keys(object).forEach(objKey => {
        this._validateProp(object[objKey], validator._);
      });
    } else {
      Object.keys(validator).forEach(key => {
        this._validateProp(object[key], validator[key]);
      });
    }
    return true;
  }

  _validateProp(prop: any, validator: ComparerType) {
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

  _isValid(prop: any, validatorElement: string | Object) {
    if (prop === null && validatorElement === "null") {
      return true;
    }

    if (prop === undefined && validatorElement === "void") {
      return true;
    }

    // Protects against NaN passing as a number
    if (isNaN(prop) && validatorElement === "number") {
      return false;
    }

    if (typeof prop === validatorElement && !Array.isArray(prop)) {
      return true;
    }

    if (Array.isArray(prop) && validatorElement === "array") {
      return true;
    }

    if (Array.isArray(prop) && Array.isArray(validatorElement)) {
      const propLength = prop.length;
      const validatorLength = validatorElement.length;

      // If empty array passed at prop or as validator then passes
      if (propLength === 0 || validatorLength === 0) {
        return true;
      }

      for (let i = 0; i < validatorLength; i++) {
        for (let j = 0; j < propLength; j++) {
          if (this._validateProp(prop[j], validatorElement[i])) {
            return true;
          }
        }
      }
      return false;
    }

    if (
      typeof validatorElement === "object" ||
      typeof validatorElement === "function"
    ) {
      // Allows for object properties to be validated against instances
      try {
        if (prop instanceof validatorElement) {
          return true;
        }
      } catch (e) {}
      // Allows for use of object validators to validate nested props
      try {
        if (this._validateObject(prop, validatorElement)) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  // REGISTRATION
  register(
    component: ComponentType,
    updateKeys: $Keys<StateType> | Array<$Keys<StateType>>
  ) {
    this._debugger({ register: { component, updateKeys } });
    const id = Symbol("Shared State ID");

    // Allows for the use of single key or array of keys
    if (typeof updateKeys === "string") {
      updateKeys = [updateKeys];
    }

    function onUpdate(updatedState: $Shape<StateType>) {
      if (Object.keys(updatedState).some(key => updateKeys.includes(key))) {
        // By setting state with symbol it won't clash with any component state prop.
        // The update will cause the state to start the re-render cycle.
        // $FlowFixMe
        component.setState({ [id]: updatedState });
      }
    }

    // By using a map, the component itself can be used as the key
    this._register.set(component, onUpdate);
  }

  unregister(component: ComponentType) {
    this._debugger({ unregister: { component } });

    // By deleting the component from the map, it is no longer included in any
    // further updates.
    this._register.delete(component);
  }

  // HOOKS
  useState<K: $Keys<StateType>>(
    propKey: K
    // $FlowFixMe
  ): [$ElementType<StateType, K>, ($ElementType<StateType, K>) => void] {
    // This will be used as the key for the update function on the registation map
    const id = Symbol("Hook ID");
    const [prop, setProp] = useState(this._state[propKey]);
    // Use effect will be only run onMount due to [] as second arg.
    useEffect((): (() => void) => {
      this._registerHook(id, propKey, setProp);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterHook(id);
      };
    }, []);
    // setStateProp allows a quick way for function components to update the prop
    const setStateProp = (value: $ElementType<StateType, K>) => {
      this.setState({ [propKey]: value });
    };
    return [prop, setStateProp];
  }

  connectAction(action: string => any, propKey: string) {
    const id = Symbol("Hook ID");

    useEffect((): (() => void) => {
      this._registerHook(id, propKey, action);

      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterHook(id);
      };
    }, []);
  }

  _registerHook<K: $Keys<StateType>>(
    id: Symbol,
    propKey: K,
    setProp: ($ElementType<StateType, K>) => void
  ) {
    this._debugger({ registerHook: { id, propKey, setProp } });

    function onUpdate(updatedState: $Shape<StateType>) {
      if (Object.keys(updatedState).includes(propKey)) {
        setProp(updatedState[propKey]);
      }
    }

    this._register.set(id, onUpdate);
  }

  _unregisterHook(id: Symbol) {
    this._debugger({ unregisterHook: { id } });

    this._register.delete(id);
  }

  // STORAGE PERSIST
  async useStorage(
    storeName: string,
    options?: { saveOnBackground?: boolean, encryptionKey?: string } = {}
  ): Promise<boolean> {
    // Function should only be run once
    if (this._asyncStoreName) {
      throw SharedState.getError(
        "STORAGE_ERROR",
        "Storage already initialised"
      );
    }

    try {
      this._asyncStoreName = storeName;
      this._encryptionKey = options.encryptionKey || false;
      this._saveOnBackground = options.saveOnBackground || false;

      // Retrieves locally stored state
      let stateString = await AsyncStorage.getItem(storeName);

      if (this._encryptionKey && stateString) {
        stateString = CryptoJS.AES.decrypt(stateString, this._encryptionKey);
        stateString = stateString.toString(CryptoJS.enc.Utf8);
      }

      if (this._saveOnBackground) {
        // Starts listening to when the app's state changes
        AppState.addEventListener("change", this._handleAppBackgrounded);
      }

      const storedState = JSON.parse(stateString);

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

  _handleAppBackgrounded(nextAppState: string) {
    // When the app switches to background the current state is saved
    if (nextAppState === "background") {
      this.save();
    }
  }

  save(): boolean {
    try {
      if (!this._asyncStoreName) throw "Store not initalised";

      let stateString = JSON.stringify(this._state);
      if (this._encryptionKey) {
        stateString = CryptoJS.AES.encrypt(
          stateString,
          this._encryptionKey
        ).toString();
      }
      AsyncStorage.setItem(this._asyncStoreName, stateString);
      this._debugger(`Storing ${this._asyncStoreName || "undefined"}`);
      return true;
    } catch (err) {
      SharedState.getError("STORAGE_SAVE_ERROR", { err });
      return false;
    }
  }

  // DEBUGGING
  _debugger(log: any) {
    if (this._debugMode) console.log(log);
  }

  toString(): string {
    return JSON.stringify(this._state, null, 2);
  }
};
