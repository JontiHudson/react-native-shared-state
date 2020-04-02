import { AppState, AppStateStatus, AsyncStorage } from 'react-native';
//@ts-ignore
import CryptoJS from 'react-native-crypto-js';

import ExtendedError from 'extended_err';

import { StateCache } from './StateCache';

import { State, StorageOptions } from '../types';

export class StorageHandler<S extends State> {
  options: StorageOptions;
  stateCache: StateCache<S>;

  constructor(stateCache: StateCache<S>, options: StorageOptions) {
    this.options = options;
    this.stateCache = stateCache;

    if (options.saveOnBackground) {
      AppState.addEventListener(
        'change',
        this.handleAppBackgrounded.bind(this),
      );
    }
  }

  async get(): Promise<S> {
    try {
      let stateString = await AsyncStorage.getItem(this.options.storeName);

      if (this.options.encryptionKey && stateString) {
        stateString = CryptoJS.AES.decrypt(
          stateString,
          this.options.encryptionKey,
        );
        // @ts-ignore
        stateString = stateString.toString(CryptoJS.enc.Utf8);
      }

      return JSON.parse(stateString, this.options.reviver);
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'STORAGE_ERROR',
        message: 'Error loading from storage',
        severity: 'HIGH',
      });
    }
  }

  async reset(resetData?: S) {
    resetData
      ? await this.save(resetData)
      : await AsyncStorage.removeItem(this.options.storeName);
  }

  async save(saveData?: S) {
    try {
      let stateString = JSON.stringify(
        saveData || this.stateCache.current,
        this.options.replacer,
      );
      if (this.options.encryptionKey) {
        stateString = CryptoJS.AES.encrypt(
          stateString,
          this.options.encryptionKey,
        ).toString();
      }
      await AsyncStorage.setItem(this.options.storeName, stateString);

      return true;
    } catch (error) {
      ExtendedError.transform(error, {
        name: 'State Error',
        code: 'STORAGE_SAVE_ERROR',
        message: 'Unable to save state',
        info: { storeName: this.options.storeName },
        severity: 'HIGH',
      });

      return false;
    }
  }

  private handleAppBackgrounded(nextAppState: AppStateStatus) {
    // When the app switches to background the current state is saved
    if (nextAppState === 'background') {
      this.save();
    }
  }
}
