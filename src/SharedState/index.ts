import ExtendedError from 'extended_err';

import { ComponentRegister } from './ComponentRegister';
import { StateCache } from './StateCache';
import { StorageHandler } from './StorageHandler';

import { onMount, onUnMount, useReRender } from '../helpers';
import { State, StorageOptions, UpdateKeys } from '../types';

type StateOptions = {
  debugMode?: boolean;
};

export class SharedState<S extends State> {
  private debugMode: boolean;
  private componentRegister: ComponentRegister<S>;
  private stateCache: StateCache<S>;
  private storageHandler: StorageHandler<S>;

  constructor(defaultState: S, options: StateOptions = {}) {
    const { debugMode } = options;

    this.debugMode = debugMode;
    this.componentRegister = new ComponentRegister();
    this.stateCache = new StateCache(defaultState);

    this.debugger(this);
  }

  get state() {
    return this.stateCache.current;
  }

  set state(object) {
    throw new ExtendedError({
      name: 'State Error',
      code: 'UPDATE_STATE_ERROR',
      message:
        'State cannot be mutated directly, use the setState() method instead.',
      severity: 'MEDIUM',
    });
  }

  get prevState() {
    return this.stateCache.prev;
  }

  set prevState(object) {
    throw new ExtendedError({
      name: 'State Error',
      code: 'UPDATE_PREV_STATE_ERROR',
      message: 'Prev state is read only.',
      severity: 'MEDIUM',
    });
  }

  setState(partialState: Partial<S>, callback?: () => void) {
    try {
      const { current } = this.stateCache;

      const updatedState: Partial<S> = {};
      let updated = false;

      for (const key in partialState) {
        // To reduce unwanted component re-renders only update props that have changed
        if (partialState[key] !== current[key]) {
          this.stateCache.updateProp(key, partialState[key]);

          // changed prop added to updatedState
          updatedState[key] = partialState[key];
          updated = true;
        }
      }

      // Only send if a change has occured
      if (updated) {
        this.componentRegister.update(updatedState);
        this.debugger({ send: updatedState });
      }
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'UPDATE_STATE_ERROR',
        message: 'Update state error',
        severity: 'HIGH',
      });
    }

    if (callback) callback();
  }

  refresh() {
    try {
      this.componentRegister.update(true);
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'REFRESH_STATE_ERROR',
        message: 'Refresh state error',
        severity: 'HIGH',
      });
    }
  }

  reset(resetData?: S) {
    const UNREGISTER_IF_NOT_UPDATED = true;

    try {
      this.stateCache.reset(resetData);
      this.componentRegister.update(
        this.stateCache.current,
        UNREGISTER_IF_NOT_UPDATED,
      );

      if (this.storageHandler) this.storageHandler.reset();

      this.debugger({ resetState: this.stateCache.current });
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'RESET_STATE_ERROR',
        message: 'Reset state error',
        severity: 'HIGH',
      });
    }
  }

  register(component: React.Component, updateKeys: UpdateKeys<S>) {
    const sharedStateId = Symbol('Shared State ID');

    function updateState() {
      component.setState({ [sharedStateId]: Symbol('Shared State Updater') });
    }

    this.componentRegister.register(component, updateKeys, updateState);

    this.debugger({ register: { component, updateKeys } });
  }

  unregister(component: React.Component) {
    this.componentRegister.unregister(component);

    this.debugger({ unregister: { component } });
  }

  // HOOKS
  useState(updateKeys: UpdateKeys<S>) {
    const componentId = Symbol('Hook ID');

    const reRender = useReRender();

    onMount(() => {
      this.componentRegister.register(componentId, updateKeys, reRender);
      this.debugger({ registerHook: { componentId, updateKeys } });
    });
    onUnMount(() => {
      this.componentRegister.unregister(componentId);
      this.debugger({ unregisterHook: { componentId } });
    });

    return [this.state, this.setState.bind(this)];
  }

  // STORAGE PERSIST
  async useStorage(options: StorageOptions) {
    this.storageHandler = new StorageHandler<S>(this.stateCache, options);

    try {
      this.reset(await this.storageHandler.get());
      return true;
    } catch (error) {
      const storageError = ExtendedError.transform(error, {
        name: 'State Error',
        code: 'STORAGE_ERROR',
        message: 'Error loading from storage',
        severity: 'HIGH',
      });

      this.reset();
      storageError.handle();
      return false;
    }
  }

  save() {
    this.debugger(`Storing ${this.storageHandler.storeName}`);

    return this.storageHandler.save();
  }

  // DEBUGGING
  debugger(log: any) {
    if (this.debugMode) console.log(log);
  }

  toString() {
    return JSON.stringify(this.state, null, 2);
  }
}
