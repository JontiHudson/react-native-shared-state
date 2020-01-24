import ExtendedError from 'extended_err';

import { MapCache } from './MapCache';

import { SharedState } from '../SharedState';
import { ComponentRegister } from '../SharedState/ComponentRegister';
import { StorageHandler } from '../SharedState/StorageHandler';

import { onMount, onUnMount, toArray, useReRender } from '../helpers';
import { Element, Map, StorageOptions } from '../types';

type MapOptions<E extends Element> = {
  debugMode?: boolean;
  defaultData?: E[];
};

type ListState = { updater: Symbol };

export class SharedMap<
  E extends Element,
  K extends keyof E
> extends SharedState<ListState> {
  private dataStorageHandler: StorageHandler<Map<E>>;
  private elementRegister: ComponentRegister<Map<E>>;
  private key: K;
  private mapCache: MapCache<E, K>;

  constructor(key: K, options: MapOptions<E> = {}) {
    const { debugMode, defaultData = [] } = options;

    super({ updater: Symbol('Initial updater') }, { debugMode });

    this.elementRegister = new ComponentRegister();
    this.key = key;
    this.mapCache = new MapCache<E, K>(defaultData, key);

    super.debugger(this);
  }

  get(id: string) {
    return this.mapCache.current[id];
  }

  get data() {
    return Object.values(this.mapCache.current);
  }

  add(newElements: E | E[], callback?: () => void) {
    try {
      const newElementsArray = toArray(newElements);
      const updatedElements = this.mapCache.add(newElementsArray);
      const updated = !updatedElements.length;

      if (updated) {
        this.elementRegister.update(updatedElements);

        super.debugger({ send: updatedElements });
      }
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'ADD_DATA_ERROR',
        message: 'Error adding data',
      });
    }

    if (callback) callback();
  }

  refresh() {
    try {
      this.elementRegister.update(true);
      super.refresh();
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'REFRESH_MAP_ERROR',
        message: 'Refresh map error',
      });
    }
  }

  remove(removeElements: E | E[], callback?: () => void) {
    try {
      const updated = this.mapCache.remove(toArray(removeElements));

      if (updated) {
        super.debugger({ removeElements });
      }
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'REMOVE_DATA_ERROR',
        message: 'Error removing data',
      });
    }

    // optional callback once complete
    if (callback) callback();
  }

  resetData(resetMap?: Map<E>) {
    const UNREGISTER_IF_NOT_UPDATED = true;

    try {
      this.mapCache.reset(resetMap);
      this.elementRegister.update(
        this.mapCache.current,
        UNREGISTER_IF_NOT_UPDATED,
      );

      super.reset();

      super.debugger({ resetState: this.mapCache.current });
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'RESET_MAP_ERROR',
        message: 'Reset map error',
      });
    }
  }

  setState() {
    throw new ExtendedError({
      name: 'State Error',
      code: 'SET_DATA_ERROR',
      message: 'Cannot set state on SharedMap',
    });
  }

  registerElement(component: React.Component, ids: string | string[]) {
    const sharedMapId = Symbol('Shared Map ID');

    function updateState() {
      component.setState({ [sharedMapId]: Symbol('Shared Map Updater') });
    }

    this.elementRegister.register(component, ids, updateState);

    super.debugger({ registerElement: { component, ids } });
  }

  unregisterElement(component: React.Component) {
    this.elementRegister.unregister(component);

    super.debugger({ unregisterElement: { component } });
  }

  registerList(component: React.Component) {
    super.register(component, 'updater');
  }

  unregisterList(component: React.Component) {
    super.unregister(component);
  }

  useElement(id: string) {
    const componentId = Symbol('Hook ID');

    const reRender = useReRender();

    onMount(() => {
      this.elementRegister.register(componentId, id, reRender);
      super.debugger({ registerHook: { componentId, id } });
    });
    onUnMount(() => {
      this.elementRegister.unregister(componentId);
      super.debugger({ unregisterHook: { componentId } });
    });

    return this.get(id);
  }

  useList() {
    super.useState('updater');
  }

  async useStorage(options: StorageOptions) {
    this.dataStorageHandler = new StorageHandler<Map<E>>(
      this.mapCache,
      options,
    );

    try {
      this.resetData(await this.dataStorageHandler.get());

      return true;
    } catch (error) {
      const storageError = ExtendedError.transform(error, {
        name: 'State Error',
        code: 'STORAGE_ERROR',
        message: 'Error loading from storage',
      });

      this.resetData();
      storageError.handle();
      return false;
    }
  }

  save() {
    super.debugger(`Storing ${this.dataStorageHandler.storeName}`);

    return this.dataStorageHandler.save();
  }

  toString() {
    return JSON.stringify(this.mapCache.current, null, 2);
  }
}