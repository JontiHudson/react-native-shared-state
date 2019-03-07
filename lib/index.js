//

// $FlowFixMe
import { AppState, AsyncStorage } from "react-native";

const getError = (code, err) => {
  const error = new Error(JSON.stringify({ ...err, code }));
  console.error(error);
  return error;
};

export default class SharedState {
  constructor(defaultState, options) {
    const { debugMode, validator } = options || {
      validator: undefined,
      debugMode: undefined
    };

    this._debugMode = debugMode;
    this._defaultState = defaultState;
    this._validator = validator;
    this._register = new Map();

    this._debugger({ defaultState, validator });

    try {
      this._validateState(this._defaultState);

      const { getState, setState, isInitialised } = this._initialiseGetAndSet();
      this.getState = getState;
      this.setState = setState;
      this.isInitialised = isInitialised;
    } catch (err) {
      throw getError("CONSTRUCT_STATE_ERROR", { err });
    }
  }

  _debugger(log) {
    if (this._debugMode) console.log(log);
  }

  _initialiseGetAndSet() {
    let _state = this._defaultState ? { ...this._defaultState } : null;

    const getState = () => {
      if (_state) {
        return { ..._state };
      }
      throw getError("GET_STATE_ERROR", {
        err: "State has not be initailised"
      });
    };

    const setState = partialState => {
      const emitState = {};
      let emit = false;
      const cachedState = JSON.stringify(_state);
      const tempState = _state || {};

      try {
        Object.keys(partialState).forEach(key => {
          if (this._validator && !this._validator[key]) {
            throw { msg: "Key does not exist in validator", key };
          }
          if (
            JSON.stringify(partialState[key]) !== JSON.stringify(tempState[key])
          ) {
            tempState[key] =
              typeof partialState[key] === "function"
                ? partialState[key](tempState[key])
                : partialState[key];
            emitState[key] = tempState[key];
            emit = true;
          }
        });
        this._validateState(emitState);
        if (emit) {
          this._send(emitState);
        }
        _state = tempState;
        return emit;
      } catch (err) {
        _state = JSON.parse(cachedState);
        throw getError("UPDATE_STATE_ERROR", { err });
      }
    };

    const isInitialised = () => !!_state;

    return { getState, setState, isInitialised };
  }

  async useStorage(storeName) {
    try {
      this._asyncStoreName = storeName;
      const storedState = JSON.parse(await AsyncStorage.getItem(storeName));
      this._debugger({ storedState });

      if (storedState) {
        this.setState(storedState);
        return true;
      }
      AppState.addEventListener("change", this._handleAppBackgrounded);
    } catch (e) {
      this.reset();
    }
    return false;
  }

  _handleAppStateChange = nextAppState => {
    if (nextAppState === "background") {
      AsyncStorage.setItem(
        this._asyncStoreName,
        JSON.stringify(this.getState())
      );
    }
  };

  _send(partialState) {
    this._debugger({ send: partialState });
    if (this._register.size) {
      this._debugger("emit");
      this._emit(partialState);
    }
  }

  _emit(emitState) {
    this._debugger({ emit: emitState });
    this._register.forEach(value => {
      value(emitState);
    });
  }

  _validateState(state, validator = this._validator) {
    this._debugger({ state, validator });
    if (!validator || !state) {
      return true;
    }

    Object.keys(state).forEach(key => {
      if (validator) {
        this._validateProp(state[key], validator[key]);
      }
    });
    return true;
  }

  _validateProp(prop, validator) {
    this._debugger({ prop, validator });
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
    throw getError("FAILED_VALIDATION", { prop, validator });
  }

  _isValid(prop, validatorElement) {
    if (prop === null && validatorElement === "null") {
      return true;
    }
    if (isNaN(prop) && validatorElement === "number") {
      return false;
    }
    if (typeof prop === validatorElement) {
      return true;
    }

    if (typeof validatorElement === "object") {
      try {
        if (prop instanceof validatorElement) {
          return true;
        }
      } catch (e) {}
      try {
        if (this._validateState(prop, validatorElement)) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  }

  register(component, updateKeys) {
    this._debugger({ register: { component, updateKeys } });

    if (typeof updateKeys === "string") {
      updateKeys = [updateKeys];
    }

    const onEmit = emittedState => {
      if (Object.keys(emittedState).some(key => updateKeys.includes(key))) {
        component.forceUpdate();
      }
    };

    this._register.set(component, onEmit);

    return true;
  }

  unregister(component) {
    this._debugger({ unregister: { component } });

    this._register.delete(component);
  }

  reset() {
    this._debugger({ reset: this._defaultState });
    this.setState(this._defaultState);
  }

  toString() {
    return JSON.stringify(this.getState(), null, 2);
  }
}
