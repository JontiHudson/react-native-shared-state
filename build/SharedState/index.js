"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extended_err_1 = require("extended_err");
const ComponentRegister_1 = require("./ComponentRegister");
const StateCache_1 = require("./StateCache");
const StorageHandler_1 = require("./StorageHandler");
const helpers_1 = require("../helpers");
class SharedState {
    constructor(defaultState, options = {}) {
        const { debugMode } = options;
        this.debugMode = debugMode;
        this.componentRegister = new ComponentRegister_1.ComponentRegister();
        this.stateCache = new StateCache_1.StateCache(defaultState);
        this.debugger(this);
    }
    get state() {
        return this.stateCache.current;
    }
    set state(object) {
        throw new extended_err_1.default({
            name: 'State Error',
            code: 'UPDATE_STATE_ERROR',
            message: 'State cannot be mutated directly, use the setState() method instead.',
        });
    }
    get prevState() {
        return this.stateCache.prev;
    }
    set prevState(object) {
        throw new extended_err_1.default({
            name: 'State Error',
            code: 'UPDATE_PREV_STATE_ERROR',
            message: 'Prev state is read only.',
        });
    }
    setState(partialState, callback) {
        try {
            const { current } = this.stateCache;
            const updatedState = {};
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
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'UPDATE_STATE_ERROR',
                message: 'Update state error',
            });
        }
        if (callback)
            callback();
    }
    refresh() {
        try {
            this.componentRegister.update(true);
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'REFRESH_STATE_ERROR',
                message: 'Refresh state error',
            });
        }
    }
    reset(resetData) {
        const UNREGISTER_IF_NOT_UPDATED = true;
        try {
            this.stateCache.reset(resetData);
            this.componentRegister.update(this.stateCache.current, UNREGISTER_IF_NOT_UPDATED);
            if (this.storageHandler)
                this.storageHandler.reset();
            this.debugger({ resetState: this.stateCache.current });
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'RESET_STATE_ERROR',
                message: 'Reset state error',
            });
        }
    }
    register(component, updateKeys) {
        const sharedStateId = Symbol('Shared State ID');
        function updateState() {
            component.setState({ [sharedStateId]: Symbol('Shared State Updater') });
        }
        this.componentRegister.register(component, updateKeys, updateState);
        this.debugger({ register: { component, updateKeys } });
    }
    unregister(component) {
        this.componentRegister.unregister(component);
        this.debugger({ unregister: { component } });
    }
    // HOOKS
    useState(updateKeys) {
        const componentId = Symbol('Hook ID');
        const reRender = helpers_1.useReRender();
        helpers_1.onMount(() => {
            this.componentRegister.register(componentId, updateKeys, reRender);
            this.debugger({ registerHook: { componentId, updateKeys } });
        });
        helpers_1.onUnMount(() => {
            this.componentRegister.unregister(componentId);
            this.debugger({ unregisterHook: { componentId } });
        });
        return [this.state, this.setState.bind(this)];
    }
    // STORAGE PERSIST
    async useStorage(options) {
        this.storageHandler = new StorageHandler_1.StorageHandler(this.stateCache, options);
        try {
            this.reset(await this.storageHandler.get());
            return true;
        }
        catch (error) {
            const storageError = extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'STORAGE_ERROR',
                message: 'Error loading from storage',
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
    debugger(log) {
        if (this.debugMode)
            console.log(log);
    }
    toString() {
        return JSON.stringify(this.state, null, 2);
    }
}
exports.SharedState = SharedState;
