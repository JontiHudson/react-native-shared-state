/// <reference types="react" />
import { State, StorageOptions, UpdateKeys } from '../types';
declare type StateOptions = {
    debugMode?: boolean;
};
export declare class SharedState<S extends State> {
    private debugMode;
    private componentRegister;
    private stateCache;
    private storageHandler;
    constructor(defaultState: S, options?: StateOptions);
    get state(): S;
    set state(object: S);
    get prevState(): S;
    set prevState(object: S);
    setState(partialState: Partial<S>, callback?: () => void): void;
    refresh(): void;
    reset(resetData?: S): void;
    register(component: React.Component, updateKeys: UpdateKeys<S>): void;
    unregister(component: React.Component): void;
    useState(updateKeys: UpdateKeys<S>): any[];
    useStorage(options: StorageOptions): Promise<boolean>;
    save(): Promise<boolean>;
    debugger(log: any): void;
    toString(): string;
}
export {};
