import { deepClone } from '../helpers';
import { State } from '../types';

export class StateCache<S extends State> {
  default: S;
  current: S;
  prev: Partial<S>;

  constructor(defaultState: S) {
    this._initialise(defaultState);
  }

  private _initialise(state: S) {
    this.default = state;
    this.current = deepClone(state);
    this.prev = {};
  }

  reset(resetData?: S) {
    this.prev = this.current;
    this.current = resetData || deepClone(this.default);
  }

  updateProp<Key extends keyof S>(key: Key, newValue: S[Key]) {
    const { [key]: currentValue } = this.current;

    if (currentValue === newValue) {
      return false;
    }

    this.prev[key] = currentValue;
    this.current[key] = newValue;

    return true;
  }
}
