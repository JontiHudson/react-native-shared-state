"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extended_err_1 = require("extended_err");
const MapCache_1 = require("./MapCache");
const SharedState_1 = require("../SharedState");
const ComponentRegister_1 = require("../SharedState/ComponentRegister");
const StorageHandler_1 = require("../SharedState/StorageHandler");
const helpers_1 = require("../helpers");
class SharedMap extends SharedState_1.SharedState {
    constructor(key, options = {}) {
        const { debugMode, defaultData = [] } = options;
        super({ updater: Symbol('Initial updater') }, { debugMode });
        this.elementRegister = new ComponentRegister_1.ComponentRegister();
        this.key = key;
        this.mapCache = new MapCache_1.MapCache(defaultData, key);
        super.debugger(this);
    }
    get(id) {
        return this.mapCache.current[id];
    }
    get data() {
        return Object.values(this.mapCache.current);
    }
    add(newElements, callback) {
        try {
            const newElementsArray = helpers_1.toArray(newElements);
            const updatedElements = this.mapCache.add(newElementsArray);
            const updated = !updatedElements.length;
            if (updated) {
                this.elementRegister.update(updatedElements);
                super.debugger({ send: updatedElements });
            }
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'ADD_DATA_ERROR',
                message: 'Error adding data',
            });
        }
        if (callback)
            callback();
    }
    refresh() {
        try {
            this.elementRegister.update(true);
            super.refresh();
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'REFRESH_MAP_ERROR',
                message: 'Refresh map error',
            });
        }
    }
    remove(removeElements, callback) {
        try {
            const updated = this.mapCache.remove(helpers_1.toArray(removeElements));
            if (updated) {
                super.debugger({ removeElements });
            }
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'REMOVE_DATA_ERROR',
                message: 'Error removing data',
            });
        }
        // optional callback once complete
        if (callback)
            callback();
    }
    resetData(resetMap) {
        const UNREGISTER_IF_NOT_UPDATED = true;
        try {
            this.mapCache.reset(resetMap);
            this.elementRegister.update(this.mapCache.current, UNREGISTER_IF_NOT_UPDATED);
            super.reset();
            super.debugger({ resetState: this.mapCache.current });
        }
        catch (error) {
            throw extended_err_1.default.transform(error, {
                name: 'State Error',
                code: 'RESET_MAP_ERROR',
                message: 'Reset map error',
            });
        }
    }
    setState() {
        throw new extended_err_1.default({
            name: 'State Error',
            code: 'SET_DATA_ERROR',
            message: 'Cannot set state on SharedMap',
        });
    }
    registerElement(component, ids) {
        const sharedMapId = Symbol('Shared Map ID');
        function updateState() {
            component.setState({ [sharedMapId]: Symbol('Shared Map Updater') });
        }
        this.elementRegister.register(component, ids, updateState);
        super.debugger({ registerElement: { component, ids } });
    }
    unregisterElement(component) {
        this.elementRegister.unregister(component);
        super.debugger({ unregisterElement: { component } });
    }
    registerList(component) {
        super.register(component, 'updater');
    }
    unregisterList(component) {
        super.unregister(component);
    }
    useElement(id) {
        const componentId = Symbol('Hook ID');
        const reRender = helpers_1.useReRender();
        helpers_1.onMount(() => {
            this.elementRegister.register(componentId, id, reRender);
            super.debugger({ registerHook: { componentId, id } });
        });
        helpers_1.onUnMount(() => {
            this.elementRegister.unregister(componentId);
            super.debugger({ unregisterHook: { componentId } });
        });
        return this.get(id);
    }
    useList() {
        super.useState('updater');
    }
    async useStorage(options) {
        this.dataStorageHandler = new StorageHandler_1.StorageHandler(this.mapCache, options);
        try {
            this.resetData(await this.dataStorageHandler.get());
            return true;
        }
        catch (error) {
            const storageError = extended_err_1.default.transform(error, {
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
exports.SharedMap = SharedMap;
