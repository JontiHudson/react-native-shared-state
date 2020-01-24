"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
//@ts-ignore
const react_native_crypto_js_1 = require("react-native-crypto-js");
const extended_err_1 = require("extended_err");
class StorageHandler {
    constructor(stateCache, options) {
        this.storeName = options.storeName;
        this.encryptionKey = options.encryptionKey || null;
        this.stateCache = stateCache;
        if (options.saveOnBackground) {
            react_native_1.AppState.addEventListener('change', this.handleAppBackgrounded.bind(this));
        }
    }
    async get() {
        try {
            let stateString = await react_native_1.AsyncStorage.getItem(this.storeName);
            if (this.encryptionKey && stateString) {
                stateString = react_native_crypto_js_1.default.AES.decrypt(stateString, this.encryptionKey);
                // @ts-ignore
                stateString = stateString.toString(react_native_crypto_js_1.default.enc.Utf8);
            }
            return JSON.parse(stateString);
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'STORAGE_ERROR',
                message: 'Error loading from storage',
            });
        }
    }
    async reset() {
        await react_native_1.AsyncStorage.removeItem(this.storeName);
    }
    async save() {
        try {
            let stateString = JSON.stringify(this.stateCache.current);
            if (this.encryptionKey) {
                stateString = react_native_crypto_js_1.default.AES.encrypt(stateString, this.encryptionKey).toString();
            }
            await react_native_1.AsyncStorage.setItem(this.storeName, stateString);
            return true;
        }
        catch (error) {
            extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'STORAGE_SAVE_ERROR',
                message: 'Unable to save state',
                info: { storeName: this.storeName },
            });
            return false;
        }
    }
    handleAppBackgrounded(nextAppState) {
        // When the app switches to background the current state is saved
        if (nextAppState === 'background') {
            this.save();
        }
    }
}
exports.StorageHandler = StorageHandler;
