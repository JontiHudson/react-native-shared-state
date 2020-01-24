/// <reference types="react" />
import { State, UpdateKeys } from '../types';
declare type RegisterKey = React.Component | Symbol;
declare type UpdateFunction<S extends State> = (updateProps: Partial<S> | true, unregisterIfNotUpdated?: boolean) => void;
export declare class ComponentRegister<S extends State> {
    map: Map<RegisterKey, UpdateFunction<S>>;
    constructor();
    register(registerKey: RegisterKey, updateKeys: UpdateKeys<S>, updateState: () => void): void;
    update(updateProps: Partial<S> | true, unregisterIfNotUpdated?: boolean): void;
    unregister(registerKey: RegisterKey): void;
}
export {};
