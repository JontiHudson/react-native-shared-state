"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../helpers");
class StateCache {
    constructor(defaultState) {
        this._initialise(defaultState);
    }
    reset(resetData = helpers_1.deepClone(this.default)) {
        this.prev = this.current;
        this.current = resetData;
    }
    updateProp(key, value) {
        if (this.prev[key] === this.current[key]) {
            return false;
        }
        this.prev[key] = this.current[key];
        if (this.current === undefined) {
            delete this.current;
        }
        else {
            this.current[key] = value;
        }
        return true;
    }
    _initialise(state) {
        this.default = state;
        this.current = helpers_1.deepClone(state);
        this.prev = { ...this.current };
    }
}
exports.StateCache = StateCache;
