import ExtendedError from 'extended_err';

import { ComponentRegister } from './ComponentRegister';
import { StateCache } from './StateCache';
import { StorageHandler } from './StorageHandler';

import { onMount, onUnMount, useReRender } from '../helpers';
import { State, StorageOptions, UpdateKey, UpdateKeys } from '../types';

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
        if (this.stateCache.updateProp(key, partialState[key])) {
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

      if (callback) callback();
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'UPDATE_STATE_ERROR',
        message: 'Update state error',
        severity: 'HIGH',
      });
    }
  }

  refresh(callback?: () => void) {
    try {
      this.componentRegister.update(true);

      if (callback) callback();
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'REFRESH_STATE_ERROR',
        message: 'Refresh state error',
        severity: 'HIGH',
      });
    }
  }

  reset(resetData?: S, callback?: () => void) {
    try {
      this.stateCache.reset(resetData);
      this.componentRegister.update(this.stateCache.current);

      if (this.storageHandler) this.storageHandler.reset(resetData);

      this.debugger({ resetState: this.stateCache.current });

      if (callback) callback();
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

    function reRenderComponent() {
      component.setState({ [sharedStateId]: Symbol('Shared State Updater') });
    }

    this.componentRegister.register(component, updateKeys, reRenderComponent);

    this.debugger({ register: { component, updateKeys } });
  }

  unregister(component: React.Component) {
    this.componentRegister.unregister(component);

    this.debugger({ unregister: { component } });
  }

  // HOOKS

  useState(
    updateKey: UpdateKeys<S>,
  ): [S, (partialState: Partial<S>, callback?: () => void) => void] {
    const componentId = Symbol('Hook ID');

    const reRenderComponent = useReRender();

    onMount(() => {
      this.componentRegister.register(
        componentId,
        updateKey,
        reRenderComponent,
      );
      this.debugger({ registerHook: { componentId, updateKey } });
    });
    onUnMount(() => {
      this.componentRegister.unregister(componentId);
      this.debugger({ unregisterHook: { componentId } });
    });

    const setValue = (partialState: Partial<S>, callback?: () => void) => {
      this.setState(partialState, callback);
    };

    return [this.state, setValue];
  }

  // STORAGE PERSIST
  async initializeStorage(options: StorageOptions) {
    this.storageHandler =
      this.storageHandler || new StorageHandler<S>(this.stateCache, options);

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

  useStorage(options: StorageOptions, callback?: () => void) {
    onMount(async () => {
      await this.initializeStorage(options);

      if (callback) callback();
    });
  }

  save() {
    this.debugger(`Storing ${this.storageHandler.options.storeName}`);

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
