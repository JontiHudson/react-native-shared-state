"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
const StateCache_1 = require("../SharedState/StateCache");
class MapCache extends StateCache_1.StateCache {
    constructor(defaultElements, key) {
        super({});
        this.defaultElements = defaultElements;
        this.key = key;
        this.add(defaultElements);
        this.default = helpers_1.deepClone(this.current);
    }
    add(newElements) {
        const updatedElements = {};
        newElements.forEach(element => {
            if (super.updateProp(element[this.key], element)) {
                updatedElements[element[this.key]] = element;
            }
        });
        return updatedElements;
    }
    remove(removeElements) {
        let updated = false;
        removeElements.forEach(element => {
            if (super.updateProp(element[this.key], undefined)) {
                updated = true;
            }
        });
        return updated;
    }
}
exports.MapCache = MapCache;
