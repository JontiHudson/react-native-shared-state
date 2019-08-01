// @flow

import { useState, useEffect } from "react";
// $FlowFixMe
import { AppState, AsyncStorage } from "react-native";

import CryptoJS from "react-native-crypto-js";

import type {
  ComparerType,
  ComponentType,
  OptionsType,
  SharedStateType,
  StatesType,
  ValidatorType
} from "../flow";

export default class SharedState<StateType: Object>
  implements SharedStateType<StateType> {
  _asyncStoreName: ?string;
  _debugMode: ?boolean;
  _encryptionKey: ?string | false;
  _handleAppBackgrounded: string => void;
  _register: Map<ComponentType | Symbol, (Object) => void>;
  _saveOnBackground: ?boolean;
  _states: StatesType<StateType>;
  _validator: ?ValidatorType;

  // HELPERS

  static getError(code: string, additionalFields?: Object = {}): Error {
    const error = new Error(JSON.stringify({ ...additionalFields, code }));
    console.error({ ...additionalFields, code });
    return error;
  }

  static deepClone<O: Object>(object: O): O {
    try {
      const objectCopy = {};

      for (var key in object) {
        const value = object[key];

        if (Array.isArray(value)) {
          objectCopy[key] = Object.values(SharedState.deepClone({ ...value }));
        } else if (value instanceof Object) {
          objectCopy[key] = SharedState.deepClone(value);
        } else {
          objectCopy[key] = value;
        }
      }

      // $FlowFixMe
      return objectCopy;
    } catch (err) {
      throw SharedState.getError("DEEP_CLONE_ERROR", {
        err
      });
    }
  }

  // INITIALISATION

  constructor(defaultState?: StateType, options: OptionsType = {}) {
    const { debugMode, validator } = options;

    this._debugMode = debugMode;
    this._validator = validator;
    this._register = new Map();

    this.validateDefaultState(defaultState);
    this.initialiseStates(defaultState);

    this._debugger(this);
  }

  validateDefaultState(defaultState?: StateType) {
    if (!!defaultState && !!this._validator) {
      try {
        this._validateObject(defaultState, this._validator);
      } catch (err) {
        throw SharedState.getError("CONSTRUCT_STATE_ERROR", {
          err,
          defaultState,
          validator: this._validator
        });
      }
    }
  }

  initialiseStates(defaultState?: StateType) {
    if (defaultState) {
      // Deep deepClone to prevent mutation of default state
      const defaultStateClone = SharedState.deepClone(defaultState);

      this._states = {
        defaultState,
        currentState: defaultStateClone,
        prevState: { ...defaultStateClone },
        initialised: true
      };
    } else {
      this._states = { initialised: false };
    }
  }

  // GETTERS AND SETTERS
  // Helps prevent state being mutated incorrectly.

  get initialised(): boolean {
    return this._states.initialised;
  }

  get state(): StateType {
    if (!this._states.initialised) {
      throw SharedState.getError("GET_STATE_ERROR", {
        message: "State has not been initalised."
      });
    }
    return this._states.currentState;
  }

  set state(object: any) {
    throw SharedState.getError("UPDATE_STATE_ERROR", {
      message:
        "State cannot be mutated directly, use the setState() method instead."
    });
  }

  get prevState(): StateType {
    if (!this._states.initialised) {
      throw SharedState.getError("GET_PREV_STATE_ERROR", {
        message: "State has not been initalised."
      });
    }
    return this._states.prevState;
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
      if (!this._states.initialised) {
        this._states = {
          defaultState: undefined,
          // $FlowFixMe
          currentState: {},
          // $FlowFixMe
          prevState: {},
          initialised: true
        };
      }
      const { currentState, prevState } = this._states;

      for (var key in partialState) {
        // To reduce unwanted component re-renders only update props that have changed
        if (partialState[key] !== currentState[key]) {
          // Throws an error if prop fails validation
          if (this._validator) {
            this._validateProp(partialState[key], this._validator[key]);
          }

          // prevState updated
          prevState[key] = currentState[key];

          // state updated
          currentState[key] = partialState[key];

          // changed prop added to updatedState
          updatedState[key] = partialState[key];
          updated = true;
        }
      }

      // Only send if a change has occured
      if (updated) this._send(updatedState);
    } catch (err) {
      console.log(err);
      throw SharedState.getError("UPDATE_STATE_ERROR", { err });
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
    if (!this._states.initialised) {
      // Do nothing if not yet initialised
      return;
    }

    const { defaultState, currentState, prevState } = this._states;
    const resetState = {};

    this._debugger({ resetState: defaultState });

    for (var key in currentState) {
      // This will force update to all current state props even if not included in default state.
      resetState[key] = undefined;
    }

    if (defaultState) {
      Object.assign(resetState, defaultState);
    }

    const _validator = this._validator;
    // Validator is skipped during reset
    this._validator = undefined;
    this.setState(resetState);
    this._validator = _validator;

    this.initialiseStates(defaultState);

    if (this._asyncStoreName) {
      AsyncStorage.removeItem(this._asyncStoreName);
    }
  }

  // VALIDATION
  _validateObject(object: Object, validator: ValidatorType) {
    this._debugger({ object, validator });

    const validatorKeys = Object.keys(validator);

    if (validatorKeys[0] === "_") {
      // _ acts as wild card so every object prop is tested against
      // the validator prop.
      for (var objKey in object) {
        this._validateProp(object[objKey], validator._);
      }
    } else {
      for (var key in validator) {
        this._validateProp(object[key], validator[key]);
      }
    }
    return true;
  }

  _validateProp(prop: any, validator: ComparerType) {
    this._debugger({ prop, validator });

    // Prop validator can be a single type or an array of types
    if (Array.isArray(validator)) {
      for (var validatorElement of validator) {
        if (this._isValid(prop, validatorElement)) {
          return true;
        }
      }
    } else if (this._isValid(prop, validator)) {
      return true;
    }
    throw SharedState.getError("FAILED_VALIDATION", { prop, validator });
  }

  _isValid(prop: any, validatorProp: string | Object) {
    if (prop === null && validatorProp === "null") {
      return true;
    }

    if (prop === undefined && validatorProp === "void") {
      return true;
    }

    // Protects against NaN passing as a number
    if (isNaN(prop) && validatorProp === "number") {
      return false;
    }

    if (typeof prop === validatorProp && !Array.isArray(prop)) {
      return true;
    }

    if (Array.isArray(prop) && validatorProp === "array") {
      return true;
    }

    if (Array.isArray(prop) && Array.isArray(validatorProp)) {
      // If empty array passed at prop or as validator then passes
      if (prop.length === 0 || validatorProp.length === 0) {
        return true;
      }

      for (var propElement of prop) {
        for (var validatorElement of validatorProp) {
          try {
            if (this._validateProp(propElement, validatorElement)) {
              return true;
            }
          } catch (e) {}
        }
      }

      return false;
    }

    if (
      typeof validatorProp === "object" ||
      typeof validatorProp === "function"
    ) {
      // Allows for object properties to be validated against instances
      try {
        if (prop instanceof validatorElement) {
          return true;
        }
      } catch (e) {}
      // Allows for use of object validators to validate nested props
      try {
        if (this._validateObject(prop, validatorProp)) {
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
    const updateKeysArray = Array.isArray(updateKeys)
      ? updateKeys
      : [updateKeys];

    function onUpdate(updatedState: $Shape<StateType>) {
      if (
        Object.keys(updatedState).some(key => updateKeysArray.includes(key))
      ) {
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
  useState(
    updateKeys: $Keys<StateType> | Array<$Keys<StateType>>
  ): [
    StateType,
    (partialState: $Shape<StateType>, callback?: () => any) => void
  ] {
    // This will be used as the key for the update function on the registation map
    const id = Symbol("Hook ID");
    const updateKeysArray = Array.isArray(updateKeys)
      ? updateKeys
      : [updateKeys];

    const reRender = useState({})[1];
    // Use effect will be only run onMount due to [] as second arg.
    useEffect((): (() => void) => {
      this._registerHook(id, updateKeysArray, reRender);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterHook(id);
      };
    }, []);

    return [this.state, this.setState.bind(this)];
  }

  _registerHook(
    id: Symbol,
    updateKeys: Array<$Keys<StateType>>,
    reRender: Function
  ) {
    this._debugger({ registerHook: { id, updateKeys } });

    function onUpdate(updatedState: $Shape<StateType>) {
      const update = Object.keys(updatedState).some(key =>
        updateKeys.includes(key)
      );

      update && reRender({});
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
        AppState.addEventListener(
          "change",
          this._handleAppBackgrounded.bind(this)
        );
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

  save(storeName?: ?string = this._asyncStoreName): boolean {
    try {
      if (!storeName) throw "Store not initalised";

      if (!this._states.initialised) {
        // Doesn't save if not initialised
        return false;
      }

      let stateString = JSON.stringify(this._states.currentState);
      if (this._encryptionKey) {
        stateString = CryptoJS.AES.encrypt(
          stateString,
          this._encryptionKey
        ).toString();
      }
      AsyncStorage.setItem(storeName, stateString);
      this._debugger(`Storing ${storeName || "undefined"}`);
      return true;
    } catch (err) {
      SharedState.getError("STORAGE_SAVE_ERROR", {
        err,
        storeName
      });
      return false;
    }
  }

  // DEBUGGING
  _debugger(log: any) {
    if (this._debugMode) console.log(log);
  }

  toString(): string {
    return JSON.stringify(this.state, null, 2);
  }
}
