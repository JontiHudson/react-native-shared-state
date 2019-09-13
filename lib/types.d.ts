import { Component, PureComponent } from 'react';

export type ComparerType = string | Object | Array<string | Object>;
export type ValidatorType = {
  [key: string]: ComparerType;
};

export type OptionsType = {
  validator?: ValidatorType;
  debugMode?: boolean;
};

export type StatesType<StateType extends Object> =
  | {
      initialised: false;
    }
  | {
      defaultState?: StateType;
      currentState: StateType;
      prevState: StateType;
      initialised: true;
    };

export type ComponentType = Component<any, any> | PureComponent<any, any>;

declare class SharedState<StateType extends Object> {
  readonly initialised: boolean;

  readonly state: StateType;

  readonly prevState: StateType;

  constructor(defaultState?: StateType, options?: OptionsType);

  public setState(partialState: Partial<StateType>, callback?: () => any): void;

  public reset(): void;

  public register(
    component: ComponentType,
    updateKeys: keyof StateType | Array<keyof StateType>,
  ): void;

  public unregister(component: ComponentType): void;

  public useState(
    updateKeys: keyof StateType | Array<keyof StateType>,
  ): [StateType, (partialState: Partial<StateType>, callback?: () => any) => void];

  public useStorage(
    storeName: string,
    options?: { saveOnBackground?: boolean; encryptionKey?: string },
  ): Promise<boolean>;

  public save(storeName?: string): boolean;

  public toString(): string;

  public _validateProp(prop: any, validator: ComparerType): boolean;
}

export type MapType<ElementType extends Object> = {
  [key: string]: ElementType;
};

export type MapStateType<ElementType extends Object> = {
  _map: MapType<ElementType>;
  _organisedArrays: { [key: string]: Array<ElementType> };
  _lastUpdated: Date | void;
};

export type organiseFunctionType<ElementType extends Object> = {
  filter?: (element: ElementType) => boolean;
  sort?: (a: ElementType, b: ElementType) => number;
};

export type organiseFunctionsType<ElementType extends Object> = {
  [key: string]: organiseFunctionType<ElementType>;
};

export type ShareMapOptionsType<ElementType extends Object> = {
  validator?: ComparerType;
  debugMode?: boolean;
  defaultData?: Array<ElementType>;
  organiseFunctions?: organiseFunctionsType<ElementType>;
};

declare class SharedMap<ElementType extends Object> extends SharedStateType<
  MapStateType<ElementType>
> {
  readonly data: Array<ElementType>;

  readonly length: number;

  readonly organisedArrays: { [key: string]: Array<ElementType> };

  get(id: string | number): ElementType | void;

  set(element: ElementType, _update?: boolean): void;

  remove(id: string, _skipLastUpdated?: boolean): void;

  updateData(newData: Array<ElementType>, callback?: () => any): void;

  registerStore(component: ComponentType): void;

  unregisterStore(component: ComponentType): void;

  registerElement(component: ComponentType, elementId: string): void;

  unregisterElement(component: ComponentType): void;

  useElement(elementId: string | number): [ElementType | void, (element: ElementType) => void];

  useStore(): [Date | void];
}
