// @flow

import { Component, PureComponent } from "react";

export type StateType = { [prop: string]: any } | {};

export type ComparerType = string | Object | Array<string | Object>;
export type ValidatorType = {
  [string]: ComparerType
};

export type OptionsType = {
  validator?: ValidatorType,
  debugMode?: boolean
};

export type ComponentType = Component<any, any> | PureComponent<any, any>;

type FunctionType<T> = T => T;
export type AllowFunctionType = <V>(V) => FunctionType<V> | V;
