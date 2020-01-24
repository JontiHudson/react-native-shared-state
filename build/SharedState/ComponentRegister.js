"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
class ComponentRegister {
    constructor() {
        this.map = new Map();
    }
    register(registerKey, updateKeys, updateState) {
        const updateKeysArray = helpers_1.toArray(updateKeys);
        function onUpdate(updateProps, unregisterIfNotUpdated) {
            if (updateProps === true ||
                Object.keys(updateProps).some(key => updateKeysArray.includes(key))) {
                updateState();
            }
            else if (unregisterIfNotUpdated) {
                this.unregister(registerKey);
            }
        }
        this.map.set(registerKey, onUpdate);
    }
    update(updateProps, unregisterIfNotUpdated) {
        this.map.forEach(onUpdate => onUpdate(updateProps, unregisterIfNotUpdated));
    }
    unregister(registerKey) {
        this.map.delete(registerKey);
    }
}
exports.ComponentRegister = ComponentRegister;
