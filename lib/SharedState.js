//      

import { useState, useEffect } from "react";
// $FlowFixMe
import { AppState, AsyncStorage } from "react-native";

import CryptoJS from "react-native-crypto-js";

             
               
                
              
                  
             
               
                 

export default class SharedState                   
                                        {
                           
                       
                                  
                                         
                                                           
                              
                                 
                             

  static getError(code        , ...arg            )        {
    // $FlowFixMe
    const error = new Error(JSON.stringify({ code, ...arg }));
    // $FlowFixMe
    console.error({ code, ...arg });
    return error;
  }

  static clone           (object   )    {
    const copy = {};
    const keys = Object.keys(object);

    keys.forEach((key        ) => {
      const value = object[key];
      if (Array.isArray(value)) {
        copy[key] = Object.values(SharedState.clone({ ...value }));
      } else if (value instanceof Object) {
        copy[key] = SharedState.clone(value);
      } else {
        copy[key] = value;
      }
    });

    // $FlowFixMe
    return copy;
  }

  constructor(defaultState            , options              = {}) {
    const { debugMode, validator } = options;

    // Validate default state
    try {
      if (!!defaultState && !!validator)
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
    this._validator = validator;
    this._register = new Map();

    if (defaultState) {
      this._states = {
        defaultState,
        // Deep clone to prevent mutation of default state
        currentState: SharedState.clone(defaultState),
        // prevState will allow for componentShouldUpdate comparisons
        prevState: SharedState.clone(defaultState),
        initialised: true
      };
    } else {
      this._states = { initialised: false };
    }

    this._debugger(this);
  }

  // GETTERS AND SETTERS
  // Helps prevent state being mutated incorrectly.

  get state()            {
    if (!this._states.initialised) {
      throw SharedState.getError("GET_STATE_ERROR", {
        message: "State has not been initalised."
      });
    }
    return this._states.currentState;
  }

  set state(object     ) {
    throw SharedState.getError("UPDATE_STATE_ERROR", {
      message:
        "State cannot be mutated directly, use the setState() method instead."
    });
  }

  get prevState()            {
    if (!this._states.initialised) {
      throw SharedState.getError("GET_PREV_STATE_ERROR", {
        message: "State has not been initalised."
      });
    }
    return this._states.prevState;
  }

  set prevState(object     ) {
    throw SharedState.getError("UPDATE_PREV_STATE_ERROR", {
      message: "Prev state is read only."
    });
  }

  // UPDATE STATE
  setState(partialState                   , callback            ) {
    const updatedState = {};
    let updated = false;

    try {
      if (!this._states.initialised) {
        this._states = {
          // $FlowFixMe
          defaultState: this._states.defaultState,
          // $FlowFixMe
          currentState: {},
          // $FlowFixMe
          prevState: {},
          initialised: true
        };
      }
      const { currentState, prevState } = this._states;

      Object.keys(partialState).forEach(key => {
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

  _send(updatedState                   ) {
    this._debugger({ send: updatedState });

    // Run update functions mapped to registered components
    this._register.forEach((onUpdate                ) => {
      onUpdate(updatedState);
    });
  }

  reset() {
    if (!this._states.initialised) {
      // Do nothing if not yet initialised
      return;
    }

    const { defaultState, currentState, prevState } = this._states;

    this._debugger({ resetState: defaultState });

    const resetState = {};
    Object.keys(currentState).forEach((key        ) => {
      // This will force update to all current state props even if not included in default state.
      resetState[key] = undefined;
    });

    if (defaultState) {
      Object.assign(resetState, defaultState);
    }

    const _validator = this._validator;
    // Validator is skipped during reset
    this._validator = undefined;

    this.setState(resetState);
    this._validator = _validator;

    if (defaultState) {
      this._states = {
        defaultState,
        currentState: SharedState.clone(defaultState),
        prevState: SharedState.clone(defaultState),
        initialised: true
      };
    } else {
      this._states = { initialised: false };
    }

    if (this._asyncStoreName) {
      this.save();
    }
  }

  // VALIDATION
  _validateObject(object        , validator               ) {
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

  _validateProp(prop     , validator              ) {
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

  _isValid(prop     , validatorElement                 ) {
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
    component               ,
    updateKeys                                            
  ) {
    this._debugger({ register: { component, updateKeys } });
    const id = Symbol("Shared State ID");
    const updateKeysArray = Array.isArray(updateKeys)
      ? updateKeys
      : [updateKeys];

    function onUpdate(updatedState                   ) {
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

  unregister(component               ) {
    this._debugger({ unregister: { component } });

    // By deleting the component from the map, it is no longer included in any
    // further updates.
    this._register.delete(component);
  }

  // HOOKS
  useState(
    updateKeys                                            
  )   
              
                                                                   
    {
    // This will be used as the key for the update function on the registation map
    const id = Symbol("Hook ID");
    const updateKeysArray = Array.isArray(updateKeys)
      ? updateKeys
      : [updateKeys];

    const reRender = useState({})[1];
    // Use effect will be only run onMount due to [] as second arg.
    useEffect(()               => {
      this._registerHook(id, updateKeysArray, reRender);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterHook(id);
      };
    }, []);

    return [this.state, this.setState.bind(this)];
  }

  _registerHook(
    id        ,
    updateKeys                         ,
    reRender          
  ) {
    this._debugger({ registerHook: { id, updateKeys } });

    function onUpdate(updatedState                   ) {
      const update = Object.keys(updatedState).some(key =>
        updateKeys.includes(key)
      );

      update && reRender({});
    }
    this._register.set(id, onUpdate);
  }

  _unregisterHook(id        ) {
    this._debugger({ unregisterHook: { id } });

    this._register.delete(id);
  }

  // STORAGE PERSIST
  async useStorage(
    storeName        ,
    options                                                          = {}
  )                   {
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

  _handleAppBackgrounded(nextAppState        ) {
    // When the app switches to background the current state is saved
    if (nextAppState === "background") {
      this.save();
    }
  }

  save()          {
    try {
      if (!this._asyncStoreName) throw "Store not initalised";

      if (!this._states.initialised) {
        // Doesn't save if not initialised
        return false;
      }

      let stateString = JSON.stringify(this.state);
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
      SharedState.getError("STORAGE_SAVE_ERROR", {
        err,
        storeName: this._asyncStoreName
      });
      return false;
    }
  }

  // DEBUGGING
  _debugger(log     ) {
    if (this._debugMode) console.log(log);
  }

  toString()         {
    return JSON.stringify(this.state, null, 2);
  }
}
