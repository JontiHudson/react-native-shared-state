import { deepClone } from '../helpers';
import { State } from '../types';

export class StateCache<S extends State> {
  default: S;
  current: S;
  prev: S;

  constructor(defaultState: S) {
    this._initialise(defaultState);
  }

  reset(resetData: S = deepClone(this.default)) {
    this.prev = this.current;
    this.current = resetData;
  }

  updateProp<Key extends keyof S>(key: Key, value: S[Key]) {
    if (this.prev[key] === this.current[key]) {
      return false;
    }

    this.prev[key] = this.current[key];

    if (this.current === undefined) {
      delete this.current;
    } else {
      this.current[key] = value;
    }
    return true;
  }

  private _initialise(state: S) {
    this.default = state;
    this.current = deepClone(state);
    this.prev = { ...this.current };
  }
}
