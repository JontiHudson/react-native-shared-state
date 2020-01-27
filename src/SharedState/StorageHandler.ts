import { AppState, AppStateStatus, AsyncStorage } from 'react-native';
//@ts-ignore
import CryptoJS from 'react-native-crypto-js';

import ExtendedError from 'extended_err';

import { StateCache } from './StateCache';

import { State, StorageOptions } from '../types';

export class StorageHandler<S extends State> {
  encryptionKey: string;
  stateCache: StateCache<S>;
  storeName: string;

  constructor(stateCache: StateCache<S>, options: StorageOptions) {
    this.storeName = options.storeName;
    this.encryptionKey = options.encryptionKey || null;
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
      let stateString = await AsyncStorage.getItem(this.storeName);

      if (this.encryptionKey && stateString) {
        stateString = CryptoJS.AES.decrypt(stateString, this.encryptionKey);
        // @ts-ignore
        stateString = stateString.toString(CryptoJS.enc.Utf8);
      }

      return JSON.parse(stateString);
    } catch (error) {
      throw ExtendedError.transform(error, {
        name: 'State Error',
        code: 'STORAGE_ERROR',
        message: 'Error loading from storage',
        severity: 'HIGH',
      });
    }
  }

  async reset() {
    await AsyncStorage.removeItem(this.storeName);
  }

  async save() {
    try {
      let stateString = JSON.stringify(this.stateCache.current);
      if (this.encryptionKey) {
        stateString = CryptoJS.AES.encrypt(
          stateString,
          this.encryptionKey,
        ).toString();
      }
      await AsyncStorage.setItem(this.storeName, stateString);

      return true;
    } catch (error) {
      ExtendedError.transform(error, {
        name: 'State Error',
        code: 'STORAGE_SAVE_ERROR',
        message: 'Unable to save state',
        info: { storeName: this.storeName },
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
