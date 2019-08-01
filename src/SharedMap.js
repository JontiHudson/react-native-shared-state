// @flow

import { useState, useEffect } from "react";

import SharedState from "./SharedState";

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

export default class SharedMap<ElementType: Object>
  extends SharedState<MapStateType<ElementType>>
  implements SharedMapType<ElementType> {
  _defaultData: ?Array<ElementType>;
  _elementValidator: ?ComparerType;
  _key: ?string;
  _organiseFunctions: organiseFunctionsType<ElementType>;
  _registerElement: Map<ComponentType | Symbol, (Array<string> | null) => void>;

  constructor(key: string, options?: ShareMapOptionsType<ElementType> = {}) {
    const { validator, organiseFunctions = {}, defaultData } = options;

    const _organisedArrays = {};
    for (var name in organiseFunctions) {
      _organisedArrays[name] = [];
    }

    super(
      {
        _map: {},
        _organisedArrays,
        _lastUpdated: null
      },
      { debugMode: options.debugMode }
    );

    this._defaultData = defaultData;
    this._elementValidator = validator;
    this._key = key;
    this._organiseFunctions = organiseFunctions;
    this._registerElement = new Map();

    if (defaultData) {
      this.updateData(defaultData);
    }
  }

  // GETTERS AND SETTERS

  get(id: string | number): ?ElementType {
    return this.state._map[id];
  }

  get data(): Array<ElementType> {
    // $FlowFixMe
    return Object.values(this.state._map);
  }

  get length(): number {
    return this.state._map.size;
  }

  get organisedArrays(): { [string]: Array<ElementType> } {
    return this.state._organisedArrays;
  }

  set(element: ElementType, _update?: boolean = true) {
    var id;

    try {
      if (this._elementValidator) {
        super._validateProp(element, this._elementValidator);
      }

      id = element[this._key];
      this.state._map[id] = element;

      if (_update) {
        this._organiseArrays([element]);
        this._updateElements([id]);
      }
    } catch (err) {
      throw SharedState.getError("SET_ELEMENT_ERROR", { element, id, err });
    }
  }

  remove(id: string, _update?: boolean = true) {
    const currentElement = this.state._map[id];
    if (currentElement) {
      delete this.state._map[id];
    } else {
      throw SharedState.getError("ELEMENT_NOT_FOUND", { id });
    }
    if (_update) {
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
    for (var element of newData) {
      const id = element[this._key];
      this.set(element, false);
      newIds.add(id);
    }
  }

  _updateElements(ids: Array<string> | null) {
    const onUpdateArray = this._registerElement.values();

    for (var onUpdate of onUpdateArray) {
      // $FlowFixMe
      onUpdate(ids);
    }

    this.setState({ _lastUpdated: new Date() });
  }

  reset() {
    super.reset();

    if (this._defaultData) {
      this.updateData(this._defaultData);
    }

    // updates all connected components
    this._updateElements(null);
  }

  // VALIDATION

  _validateMap(map: MapType<ElementType>, validator: ComparerType) {
    Object.keys(map).forEach((key: string) => {
      super._validateProp(map[key], validator);
    });
  }

  // ORGANISE

  _organiseArrays(elementArray: Array<ElementType>) {
    for (var name in this._organiseFunctions) {
      this._organiseArray(
        elementArray,
        this._organiseFunctions[name],
        this.state._organisedArrays[name]
      );
    }
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
    let tempIndex = 0;

    for (const newElement of newElements) {
      const organisedElement = {
        element: newElement,
        remove: filter && !filter(newElement)
      };

      if (!sort) {
        tempArray.push(organisedElement);
        return;
      }

      while (tempIndex > 0) {
        const comparerValue = sort(
          newElement,
          tempArray[tempIndex - 1].element
        );
        if (comparerValue < 0) {
          tempIndex--;
        } else {
          tempArray.splice(tempIndex, 0, organisedElement);
          tempIndex++;
          return;
        }
      }

      tempArray.unshift(organisedElement);
      tempIndex++;
    }
  }

  _addToSortedArray(
    tempArray: Array<{ element: ElementType, remove?: boolean }>,
    organisedArray: Array<ElementType>,
    sort: (ElementType, ElementType) => number
  ) {
    const key = this._key;

    var organisedArrayLength = organisedArray.length;
    var startIndex = 0;

    for (const { element, remove } of tempArray) {
      var oldRemoved = false;
      var toAdd = !remove;
      var endIndex;

      for (
        let i = startIndex;
        i < organisedArrayLength && (toAdd || !oldRemoved);
        i++
      ) {
        const organisedElement = organisedArray[i];

        if (element[key] === organisedElement[key]) {
          organisedArray.splice(i, 1);
          oldRemoved = true;
          organisedArrayLength--;
          i--;
        } else if (toAdd) {
          const comparerValue = sort(element, organisedElement);
          if (comparerValue < 0) {
            organisedArray.splice(i, 0, element);
            toAdd = false;
            organisedArrayLength++;
            endIndex = i;
          }
        }
      }

      if (toAdd) {
        organisedArray.push(element);
        endIndex = organisedArrayLength + 1;
      }

      if (!oldRemoved) {
        for (let i = 0; i < startIndex; i++) {
          if (element[key] === organisedArray[i][key]) {
            organisedArray.splice(i, 1);
            oldRemoved = true;
            organisedArrayLength--;
            break;
          }
        }
      }

      startIndex = endIndex;
    }
  }

  _addToUnsortedArray(
    tempArray: Array<{ element: ElementType, remove?: boolean }>,
    organisedArray: Array<ElementType>
  ) {
    const key = this._key;

    for (const { element, remove } of tempArray) {
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
    }
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
    // $FlowFixMe
    return this.useState("_lastUpdated")[0];
  }

  useElement(
    elementId: string | number
  ): [?ElementType, (ElementType) => void] {
    // This will be used as the key for the update function on the registation map
    const componentId = Symbol("Hook ID");
    const reRender = useState({})[1];

    useEffect((): (() => void) => {
      this._registerElementHook(componentId, elementId, reRender);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        this._unregisterElementHook(componentId);
      };
    }, []);

    return [this.get(elementId), this.set];
  }

  _registerElementHook(
    id: Symbol,
    elementId: string | number,
    reRender: ({}) => void
  ) {
    this._debugger({ registerHook: { id, elementId } });
    const onUpdate = (updatedIds: Array<string> | null) => {
      if (updatedIds === null || updatedIds.includes(elementId)) {
        reRender({});
      }
    };
    this._registerElement.set(id, onUpdate);
  }

  _unregisterElementHook(id: Symbol) {
    this._debugger({ unregisterHook: { id } });
    this._register.delete(id);
  }
}
