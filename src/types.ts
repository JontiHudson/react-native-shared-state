export type Element = { [key: string]: any };
export type State = { [key: string]: any };

export type Map<E extends Element> = { [key: string]: E };

export type StorageOptions = {
  encryptionKey?: string;
  replacer?: (key: string, value: any) => any;
  reviver?: (key: string, value: any) => any;
  saveOnBackground?: boolean;
  storeName: string;
};

export type UpdateKey<State> = keyof State;
export type UpdateKeys<State> = UpdateKey<State> | UpdateKey<State>[];

export type OrganiseFunction<E extends Element> = {
  filter?: (element: E) => boolean;
  sort?: (a: E, b: E) => number;
};

export type OrganiserName = string;

export type OrganiseFunctions<E extends Element, O extends OrganiserName> = {
  [Key in O]: OrganiseFunction<E>;
};

export type LazyGetFunction<D> = (page: number) => D[] | Promise<D[]>;
