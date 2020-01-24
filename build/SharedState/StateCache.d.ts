import { State } from '../types';
export declare class StateCache<S extends State> {
    default: S;
    current: S;
    prev: S;
    constructor(defaultState: S);
    reset(resetData?: S): void;
    updateProp<Key extends keyof S>(key: Key, value: S[Key]): boolean;
    private _initialise;
}
