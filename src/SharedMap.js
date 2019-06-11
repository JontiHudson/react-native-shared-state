// @flow

// $FlowFixMe
import { useState, useEffect } from "react";
// $FlowFixMe
import { AppState, AsyncStorage } from "react-native";

import { SharedState } from "./SharedState";

import CryptoJS from "react-native-crypto-js";

import type {
  ValidatorType,
  ComponentType,
  ComparerType,
  SharedStateType,
  MapType,
  MapStateType,
  organiseFunctionType,
  organiseFunctionsType,
  ShareMapOptionsType,
  SharedMapType
} from "../flow";

export const SharedMap = class SharedMap<ElementType: Object>
  extends SharedState<MapStateType<ElementType>>
  implements SharedMapType<ElementType> {
  _elementValidator: ?ComparerType;
  _registerElement: Map<ComponentType | Symbol, (Array<string> | null) => void>;
  _organiseFunctions: organiseFunctionsType<ElementType>;
  _key: ?string;

  constructor(key: string, options: ShareMapOptionsType<ElementType> = {}) {
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
    Object.keys(this._organiseFunctions).forEach((name: string) => {
      this._state.organisedArrays[name] = [];
    });

    if (defaultData) {
      this.updateData(defaultData);
      this._defaultState = JSON.parse(JSON.stringify(this._state));
      this._defaultState._lastUpdated = null;
    }
  }

  // GETTERS AND SETTERS

  get(id: string): ?ElementType {
    const element = this.state._map[id];

    return element;
  }

  get data(): Array<ElementType> {
    // $FlowFixMe
    return Object.values(this.state._map);
  }

  get organisedArrays(): { [string]: Array<ElementType> } {
    return this._state.organisedArrays;
  }

  set(element: ElementType, _update?: boolean = true) {
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

  remove(id: string, _skipLastUpdated?: boolean) {
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

  updateData(newData: Array<ElementType>, callback?: () => any) {
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

  _updateDataFromArray(newData: Array<ElementType>, newIds: Set<string>) {
    newData.forEach((element: ElementType) => {
      // $FlowFixMe
      const id = element[this._key];
      this.set(element, false);
      newIds.add(id);
    });
  }

  _updateElements(ids: Array<string> | null) {
    this._registerElement.forEach(
      (onUpdate: (Array<string> | null) => void) => {
        onUpdate(ids);
      }
    );
  }

  reset() {
    super.reset();

    // updates all connected components
    this._updateElements(null);
    this.setState({ _lastUpdated: new Date() });
  }

  // VALIDATION

  _validateMap(map: MapType<ElementType>, validator: ComparerType) {
    Object.keys(map).forEach((key: string) => {
      super._validateProp(map[key], validator);
    });
  }

  // ORGANISE

  _organiseArrays(elementArray: Array<ElementType>) {
    Object.keys(this._organiseFunctions).forEach((name: string) => {
      this._organiseArray(
        elementArray,
        this._organiseFunctions[name],
        this._state.organisedArrays[name]
      );
    });
  }

  _organiseArray(
    newElements: Array<ElementType>,
    organiseFunction: organiseFunctionType<ElementType>,
    organisedArray: Array<ElementType>
  ) {
    const newElementsLength = newElements.length;

    const tempArray = [];

    this._sortAndFilterNewElements(newElements, organiseFunction, tempArray);

    if (organiseFunction.sort) {
      this._addToSortedArray(tempArray, organisedArray, organiseFunction.sort);
    } else {
      this._addToUnsortedArray(tempArray, organisedArray);
    }
  }

  _sortAndFilterNewElements(
    newElements: Array<ElementType>,
    { filter, sort }: organiseFunctionType<ElementType>,
    tempArray: Array<{ element: ElementType, remove?: boolean }>
  ) {
    var tempSize = 0;

    newElements.forEach((newElement: ElementType) => {
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

  _addToSortedArray(
    tempArray: Array<{ element: ElementType, remove?: boolean }>,
    organisedArray: Array<ElementType>,
    sort: (ElementType, ElementType) => number
  ) {
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

  _addToUnsortedArray(
    tempArray: Array<{ element: ElementType, remove?: boolean }>,
    organisedArray: Array<ElementType>
  ) {
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

  unregister(component: ComponentType) {
    this.unregisterStore(component);
    this.unregisterElement(component);
  }

  registerStore(component: ComponentType) {
    super.register(component, "_lastUpdated");
  }

  unregisterStore(component: ComponentType) {
    super.unregister(component);
  }

  registerElement(component: ComponentType, elementId: string) {
    this._debugger({ register: { component, elementId } });
    const id = Symbol("Shared State ID");

    function onUpdate(updatedIds: Array<string> | null) {
      if (updatedIds === null || updatedIds.includes(elementId)) {
        // By setting state with symbol it won't clash with any component state prop.
        // The update will cause the state to start the re-render cycle.
        // $FlowFixMe
        component.setState({ [id]: updatedIds });
      }
    }
    this._registerElement.set(component, onUpdate);
  }

  unregisterElement(component: ComponentType) {
    this._debugger({ unregister: { component } });

    // By deleting the component from the map, it is no longer included in any
    // further updates.
    this._registerElement.delete(component);
  }

  // HOOKS

  useStore(): [?Date] {
    return [this.useState("_lastUpdated")[0]];
  }

  useElement(elementId: string): [ElementType, (ElementType) => void] {
    // This will be used as the key for the update function on the registation map
    const componentId = Symbol("Hook ID");
    const [element, setElement] = useState(this.get(elementId));

    useEffect((): (Symbol => void) => {
      this._registerElementHook(componentId, elementId, setElement);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterElementHook(componentId);
      };
    }, []);
    // setStateProp allows a quick way for function components to update the prop
    const setMapElement = (newElement: ElementType) => {
      this.set(newElement);
    };
    return [element, setMapElement];
  }

  _registerElementHook(
    id: Symbol,
    elementId: string,
    setElement: (?ElementType) => void
  ) {
    this._debugger({ registerHook: { id, elementId } });
    const onUpdate = (updatedIds: Array<string> | null) => {
      if (updatedIds === null || updatedIds.includes(elementId)) {
        setElement(this.get(elementId));
      }
    };
    this._registerElement.set(id, onUpdate);
  }

  _unregisterElementHook(id: Symbol) {
    this._debugger({ unregisterHook: { id } });
    this._register.delete(id);
  }
};