import { useState, useEffect, useRef } from 'react';

import SharedState from './SharedState';

import { getError } from './helpers';

export default class SharedMap extends SharedState {
  constructor(key, options = {}) {
    const { validator, organiseFunctions = {}, defaultData } = options;

    const _organisedArrays = {};
    for (const name in organiseFunctions) {
      _organisedArrays[name] = [];
    }

    super(
      {
        _map: {},
        _organisedArrays,
        _lastUpdated: null,
      },
      { debugMode: options.debugMode },
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

  get(id) {
    return this.state._map[id];
  }

  get data() {
    // $FlowFixMe
    return Object.values(this.state._map);
  }

  get length() {
    return this.state._map.size;
  }

  get organisedArrays() {
    return this.state._organisedArrays;
  }

  set(element, _update = true) {
    let id;

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
      throw getError('SET_ELEMENT_ERROR', { element, id, err });
    }
  }

  remove(id, _update = true) {
    const currentElement = this.state._map[id];
    if (currentElement) {
      delete this.state._map[id];
    } else {
      throw getError('ELEMENT_NOT_FOUND', { id });
    }
    if (_update) {
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
        throw new Error('Data must be as array');
      }
      this._organiseArrays(newData);
      this._updateElements([...ids]);

      if (callback) callback();
    } catch (err) {
      throw getError('UPDATE_MAP_ERROR', {
        newData,
        key: this._key,
        err,
      });
    }
  }

  _updateDataFromArray(newData, newIds) {
    for (const element of newData) {
      const id = element[this._key];
      this.set(element, false);
      newIds.add(id);
    }
  }

  _updateElements(ids) {
    const onUpdateArray = this._registerElement.values();

    for (const onUpdate of onUpdateArray) {
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

  _validateMap(map, validator) {
    Object.keys(map).forEach((key) => {
      super._validateProp(map[key], validator);
    });
  }

  // ORGANISE

  _organiseArrays(elementArray) {
    for (const name in this._organiseFunctions) {
      this._organiseArray(
        elementArray,
        this._organiseFunctions[name],
        this.state._organisedArrays[name],
      );
    }
  }

  _organiseArray(newElements, organiseFunction, organisedArray) {
    const tempArray = [];

    SharedMap._sortAndFilterNewElements(newElements, organiseFunction, tempArray);

    if (organiseFunction.sort) {
      this._addToSortedArray(tempArray, organisedArray, organiseFunction.sort);
    } else {
      this._addToUnsortedArray(tempArray, organisedArray);
    }
  }

  static _sortAndFilterNewElements(newElements, { filter, sort }, tempArray) {
    newElementLoop: for (const newElement of newElements) {
      let tempIndex = tempArray.length;
      const organisedElement = {
        element: newElement,
        remove: filter && !filter(newElement),
      };

      if (!sort) {
        tempArray.push(organisedElement);
        return;
      }

      while (tempIndex > 0) {
        const comparerValue = sort(newElement, tempArray[tempIndex - 1].element);

        if (comparerValue < 0) {
          tempIndex--;
        } else {
          tempArray.splice(tempIndex, 0, organisedElement);
          tempIndex++;
          continue newElementLoop;
        }
      }

      tempArray.unshift(organisedElement);
    }
  }

  _addToSortedArray(tempArray, organisedArray, sort) {
    const key = this._key;

    let organisedArrayLength = organisedArray.length;
    let startIndex = 0;

    for (const { element, remove } of tempArray) {
      let oldRemoved = false;
      let toAdd = !remove;
      let endIndex;

      for (let i = startIndex; i < organisedArrayLength && (toAdd || !oldRemoved); i++) {
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

  _addToUnsortedArray(tempArray, organisedArray) {
    const key = this._key;

    for (const { element, remove } of tempArray) {
      const index = organisedArray.findIndex(
        (organisedElement) => organisedElement[key] === element[key],
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
    throw getError('METHOD_MISSING', 'use either registerStore() or registerElement()');
  }

  unregister(component) {
    this.unregisterStore(component);
    this.unregisterElement(component);
  }

  registerStore(component) {
    super.register(component, '_lastUpdated');
  }

  unregisterStore(component) {
    super.unregister(component);
  }

  registerElement(component, elementId) {
    this._debugger({ register: { component, elementId } });
    const id = Symbol('Shared State ID');

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
    // $FlowFixMe
    return this.useState('_lastUpdated')[0];
  }

  useElement(elementId) {
    const isMounted = useRef(false);
    // This will be used as the key for the update function on the registation map
    const componentId = Symbol('Hook ID');

    const setState = useState({})[1];
    const reRender = () => {
      // Component will only update if still mounted
      if (isMounted.current) {
        setState({});
      } else {
        this._unregisterElementHook(componentId);
      }
    };

    useEffect(() => {
      isMounted.current = true;
      this._registerElementHook(componentId, elementId, reRender);
      // By returning _unregisterHook, it will run on unmount
      return () => {
        isMounted.current = false;
        this._unregisterElementHook(componentId);
      };
    }, []);

    return [this.get(elementId), this.set];
  }

  _registerElementHook(id, elementId, reRender) {
    this._debugger({ registerHook: { id, elementId } });
    const onUpdate = (updatedIds) => {
      if (updatedIds === null || updatedIds.includes(elementId)) {
        reRender();
      }
    };
    this._registerElement.set(id, onUpdate);
  }

  _unregisterElementHook(id) {
    this._debugger({ unregisterHook: { id } });
    this._register.delete(id);
  }
}
