import { Element, Map } from '../types';
import { StateCache } from '../SharedState/StateCache';
export declare class MapCache<E extends Element, K extends keyof E> extends StateCache<Map<E>> {
    defaultElements: E[];
    key: K;
    constructor(defaultElements: E[], key: K);
    add(newElements: E[]): Map<E>;
    remove(removeElements: E[]): boolean;
}
