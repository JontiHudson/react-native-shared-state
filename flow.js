// @flow

import { Component, PureComponent } from "react";

export type ComparerType = string | Object | Array<string | Object>;
export type ValidatorType = {
  [string]: ComparerType
};

export type OptionsType = {
  validator?: ValidatorType,
  debugMode?: boolean
};

export type StatesType<StateType: Object> =
  | {
      initialised: false
    }
  | {
      defaultState?: StateType,
      currentState: StateType,
      prevState: StateType,
      initialised: true
    };

export type ComponentType = Component<any, any> | PureComponent<any, any>;

export interface SharedStateType<StateType: Object> {
  +state: StateType | {};
  +prevState: StateType | {};

  setState(partialState: $Shape<StateType>, callback?: () => any): void;
  reset(): void;

  register(
    component: ComponentType,
    updateKeys: $Keys<StateType> | Array<$Keys<StateType>>
  ): void;
  unregister(component: ComponentType): void;

  useState(
    updateKeys: $Keys<StateType> | Array<$Keys<StateType>>
  ): [
    StateType,
    (partialState: $Shape<StateType>, callback?: () => any) => void
  ];

  useStorage(
    storeName: string,
    options?: { saveOnBackground?: boolean, encryptionKey?: string }
  ): Promise<boolean>;
  save(): boolean;

  toString(): string;

  _validateProp(prop: any, validator: ComparerType): boolean;
}

export type MapType<ElementType: Object> = { [string]: ElementType };

export type MapStateType<ElementType: Object> = {
  _map: MapType<ElementType>,
  _lastUpdated: ?Date,
  _size: number,
  organisedArrays: {
    [string]: Array<ElementType>
  }
};

export type organiseFunctionType<ElementType: Object> = {
  filter?: ElementType => boolean,
  sort?: (ElementType, ElementType) => number
};

export type organiseFunctionsType<ElementType: Object> = {
  [string]: organiseFunctionType<ElementType>
};

export type ShareMapOptionsType<ElementType: Object> = {
  validator?: ComparerType,
  debugMode?: boolean,
  defaultData?: Array<ElementType>,
  organiseFunctions?: organiseFunctionsType<ElementType>
};

export interface SharedMapType<ElementType: Object>
  extends SharedStateType<MapStateType<ElementType>> {
  +data: Array<ElementType>;
  +length: number;
  get(id: string): ?ElementType;
  set(element: ElementType, _update?: boolean): void;
  remove(id: string, _skipLastUpdated?: boolean): void;

  updateData(newData: Array<ElementType>, callback?: () => any): void;

  registerStore(component: ComponentType): void;
  unregisterStore(component: ComponentType): void;
  registerElement(component: ComponentType, elementId: string): void;
  unregisterElement(component: ComponentType): void;

  useElement(elementId: string): [?ElementType, (ElementType) => void];
  useStore(): [?Date];
}
