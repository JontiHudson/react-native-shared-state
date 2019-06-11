//

// $FlowFixMe
import { useState, useEffect } from "react";
// $FlowFixMe
import { AppState, AsyncStorage } from "react-native";

import { SharedState } from "./SharedState";

import CryptoJS from "react-native-crypto-js";

export const SharedMap = class SharedMap extends SharedState {
  constructor(key, options = {}) {
    const { validator, organiseFunctions, defaultData } = options;

    const _defaultState = {
      _map: {},
      _lastUpdated: null,
      _size: 0,
      organisedArrays: {}
    };

    super(_defaultState, { debugMode: options.debugMode });

    this._elementValidator = validator;
    this._key = key;
    this._registerElement = new Map();

    this._organiseFunctions = organiseFunctions || {};
    Object.keys(this._organiseFunctions).forEach(name => {
      this._state.organisedArrays[name] = [];
    });

    if (defaultData) {
      this.updateData(defaultData);
      this._defaultState = JSON.parse(JSON.stringify(this._state));
      this._defaultState._lastUpdated = null;
    }
  }

  // GETTERS AND SETTERS

  get(id) {
    const element = this.state._map[id];

    return element;
  }

  get data() {
    // $FlowFixMe
    return Object.values(this.state._map);
  }

  get organisedArrays() {
    return this._state.organisedArrays;
  }

  set(element, _update = true) {
    var id;
    try {
      id = element[this._key];
      if (this._elementValidator) {
        super._validateProp(element, this._elementValidator);
      }

      const currentElement = this.state._map[id];
      this.state._map[id] = element;
      if (currentElement) {
        if (_update) this._updateElements([id]);
      } else {
        this.state._size++;
      }
      if (_update) {
        this._organiseArrays([element]);
        this.setState({ _lastUpdated: new Date() });
      }
    } catch (err) {
      throw SharedState.getError("SET_ELEMENT_ERROR", { element, id, err });
    }
  }

  remove(id, _skipLastUpdated) {
    const currentElement = this.state._map[id];
    if (currentElement) {
      delete this.state._map[id];
      this.state._size--;
    } else {
      throw SharedState.getError("ELEMENT_NOT_FOUND", { id });
    }
    if (!_skipLastUpdated) {
      this.setState({ _lastUpdated: new Date() });
    }
  }

  // UPDATE MAP

  updateData(newData, callback) {
    try {
      const ids = new Set();
      if (Array.isArray(newData)) {
        this._updateDataFromArray(newData, ids);
      } else {
        throw "Data must be as array";
      }
      this._organiseArrays(newData);
      this._updateElements([...ids]);
      this.setState({ _lastUpdated: new Date() });

      if (callback) callback();
    } catch (err) {
      throw SharedState.getError("UPDATE_MAP_ERROR", {
        newData,
        key: this._key,
        err
      });
    }
  }

  _updateDataFromArray(newData, newIds) {
    newData.forEach(element => {
      // $FlowFixMe
      const id = element[this._key];
      this.set(element, false);
      newIds.add(id);
    });
  }

  _updateElements(ids) {
    this._registerElement.forEach(onUpdate => {
      onUpdate(ids);
    });
  }

  reset() {
    super.reset();

    // updates all connected components
    this._updateElements(null);
    this.setState({ _lastUpdated: new Date() });
  }

  // VALIDATION

  _validateMap(map, validator) {
    Object.keys(map).forEach(key => {
      super._validateProp(map[key], validator);
    });
  }

  // ORGANISE

  _organiseArrays(elementArray) {
    Object.keys(this._organiseFunctions).forEach(name => {
      this._organiseArray(
        elementArray,
        this._organiseFunctions[name],
        this._state.organisedArrays[name]
      );
    });
  }

  _organiseArray(newElements, organiseFunction, organisedArray) {
    const newElementsLength = newElements.length;

    const tempArray = [];

    this._sortAndFilterNewElements(newElements, organiseFunction, tempArray);

    if (organiseFunction.sort) {
      this._addToSortedArray(tempArray, organisedArray, organiseFunction.sort);
    } else {
      this._addToUnsortedArray(tempArray, organisedArray);
    }
  }

  _sortAndFilterNewElements(newElements, { filter, sort }, tempArray) {
    var tempSize = 0;

    newElements.forEach(newElement => {
      const element = {
        element: newElement,
        remove: filter && !filter(newElement)
      };

      if (!sort) {
        tempArray.push(element);
        return;
      }

      let tempIndex = tempSize - 1;

      while (tempIndex >= 0) {
        const comparerValue = sort(newElement, tempArray[tempIndex].element);
        if (comparerValue < 0) {
          tempIndex--;
        } else {
          tempArray.splice(tempIndex + 1, 0, element);
          tempSize++;
          return;
        }
      }
      tempArray.unshift(element);
      tempSize++;
      return;
    });
  }

  _addToSortedArray(tempArray, organisedArray, sort) {
    const key = this._key;

    var organisedArrayLength = organisedArray.length;
    var startIndex = 0;

    tempArray.forEach(({ element, remove }) => {
      var oldRemoved = false;
      var newAdded = remove;
      var endIndex;

      for (
        let i = startIndex || 0;
        i < organisedArrayLength && !(newAdded && oldRemoved);
        i++
      ) {
        const organisedElement = organisedArray[i];

        if (element[key] === organisedElement[key]) {
          organisedArray.splice(i, 1);
          oldRemoved = true;
          organisedArrayLength--;
          i--;
        } else if (!newAdded) {
          const comparerValue = sort(element, organisedElement);
          if (comparerValue < 0) {
            organisedArray.splice(i, 0, element);
            newAdded = true;
            organisedArrayLength++;
            endIndex = i;
          }
        }
      }

      if (!newAdded) {
        organisedArray.push(element);
        endIndex = organisedArrayLength + 1;
      }

      if (!oldRemoved) {
        for (let i = 0; i < (startIndex || 0); i++) {
          if (element[key] === organisedArray[i][key]) {
            organisedArray.splice(i, 1);
            oldRemoved = true;
            organisedArrayLength--;
            break;
          }
        }
      }

      startIndex = endIndex;
    });
  }

  _addToUnsortedArray(tempArray, organisedArray) {
    const key = this._key;
    tempArray.forEach(({ element, remove }) => {
      const index = organisedArray.findIndex(
        organisedElement => organisedElement[key] === element[key]
      );
      if (index === -1) {
        if (!remove) organisedArray.push(element);
      } else if (remove) {
        organisedArray.splice(index, 1);
      } else {
        organisedArray.splice(index, 1, element);
      }
    });
  }

  // REGISTRATION

  register() {
    throw SharedState.getError(
      "METHOD_MISSING",
      "use either registerStore() or registerElement()"
    );
  }

  unregister(component) {
    this.unregisterStore(component);
    this.unregisterElement(component);
  }

  registerStore(component) {
    super.register(component, "_lastUpdated");
  }

  unregisterStore(component) {
    super.unregister(component);
  }

  registerElement(component, elementId) {
    this._debugger({ register: { component, elementId } });
    const id = Symbol("Shared State ID");

    function onUpdate(updatedIds) {
      if (updatedIds === null || updatedIds.includes(elementId)) {
        // By setting state with symbol it won't clash with any component state prop.
        // The update will cause the state to start the re-render cycle.
        // $FlowFixMe
        component.setState({ [id]: updatedIds });
      }
    }
    this._registerElement.set(component, onUpdate);
  }

  unregisterElement(component) {
    this._debugger({ unregister: { component } });

    // By deleting the component from the map, it is no longer included in any
    // further updates.
    this._registerElement.delete(component);
  }

  // HOOKS

  useStore() {
    return [this.useState("_lastUpdated")[0]];
  }

  useElement(elementId) {
    // This will be used as the key for the update function on the registation map
    const componentId = Symbol("Hook ID");
    const [element, setElement] = useState(this.get(elementId));

    useEffect(() => {
      this._registerElementHook(componentId, elementId, setElement);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterElementHook(componentId);
      };
    }, []);
    // setStateProp allows a quick way for function components to update the prop
    const setMapElement = newElement => {
      this.set(newElement);
    };
    return [element, setMapElement];
  }

  _registerElementHook(id, elementId, setElement) {
    this._debugger({ registerHook: { id, elementId } });
    const onUpdate = updatedIds => {
      if (updatedIds === null || updatedIds.includes(elementId)) {
        setElement(this.get(elementId));
      }
    };
    this._registerElement.set(id, onUpdate);
  }

  _unregisterElementHook(id) {
    this._debugger({ unregisterHook: { id } });
    this._register.delete(id);
  }
};