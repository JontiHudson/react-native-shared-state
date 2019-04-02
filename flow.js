// @flow

import { Component, PureComponent } from "react";

export type ComparerType = string | Object | Array<string | Object>;
export type ValidatorType = {
  [string]: ComparerType
};

export type OptionsType = {
  validator?: ValidatorType,
  debugMode?: boolean,
  encryptionKey?: string
};

export type ComponentType = Component<any, any> | PureComponent<any, any>;

type FunctionType<T> = T => T;
export type AllowFunctionType = <V>(V) => FunctionType<V> | V;

export interface SharedStateType<StateType: Object> {
  +state: StateType;
  +prevState: StateType;

  setState(partialState: $Shape<StateType>, callback?: () => any): void;
  reset(): void;

  register(
    component: ComponentType,
    updateKeys: $Keys<StateType> | Array<$Keys<StateType>>
  ): void;
  unregister(component: ComponentType): void;

  useState<K: $Keys<StateType>>(
    propKey: K
  ): [$ElementType<StateType, K>, ($ElementType<StateType, K>) => void];

  useStorage(storeName: string): Promise<boolean>;
  save(): boolean;

  toString(): string;
}
