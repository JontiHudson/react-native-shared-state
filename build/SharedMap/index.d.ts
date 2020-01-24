/// <reference types="react" />
import { SharedState } from '../SharedState';
import { Element, Map, StorageOptions } from '../types';
declare type MapOptions<E extends Element> = {
    debugMode?: boolean;
    defaultData?: E[];
};
declare type ListState = {
    updater: Symbol;
};
export declare class SharedMap<E extends Element, K extends keyof E> extends SharedState<ListState> {
    private dataStorageHandler;
    private elementRegister;
    private key;
    private mapCache;
    constructor(key: K, options?: MapOptions<E>);
    get(id: string): E;
    get data(): E[];
    add(newElements: E | E[], callback?: () => void): void;
    refresh(): void;
    remove(removeElements: E | E[], callback?: () => void): void;
    resetData(resetMap?: Map<E>): void;
    setState(): void;
    registerElement(component: React.Component, ids: string | string[]): void;
    unregisterElement(component: React.Component): void;
    registerList(component: React.Component): void;
    unregisterList(component: React.Component): void;
    useElement(id: string): E;
    useList(): void;
    useStorage(options: StorageOptions): Promise<boolean>;
    save(): Promise<boolean>;
    toString(): string;
}
export {};
