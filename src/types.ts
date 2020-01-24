export type Element = { [key: string]: any };
export type State = { [key: string]: any };

export type Map<E extends Element> = {
  [key: string]: E;
};

export type StorageOptions = {
  storeName: string;
  encryptionKey?: string;
  saveOnBackground?: boolean;
};

export type UpdateKeys<State> = keyof State | (keyof State)[];

export type OrganiseFunction<E extends Element> = {
  filter?: (element: E) => boolean;
  sort?: (a: E, b: E) => number;
};

export type OrganiserName = string;

export type OrganiseFunctions<E extends Element, O extends OrganiserName> = {
  [Key in O]: OrganiseFunction<E>;
};
