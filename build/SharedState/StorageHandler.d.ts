import { StateCache } from './StateCache';
import { State, StorageOptions } from '../types';
export declare class StorageHandler<S extends State> {
    encryptionKey: string;
    stateCache: StateCache<S>;
    storeName: string;
    constructor(stateCache: StateCache<S>, options: StorageOptions);
    get(): Promise<S>;
    reset(): Promise<void>;
    save(): Promise<boolean>;
    private handleAppBackgrounded;
}
