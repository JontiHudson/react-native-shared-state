export declare type Element = {
    [key: string]: any;
};
export declare type State = {
    [key: string]: any;
};
export declare type Map<E extends Element> = {
    [key: string]: E;
};
export declare type StorageOptions = {
    storeName: string;
    encryptionKey?: string;
    saveOnBackground?: boolean;
};
export declare type UpdateKeys<State> = keyof State | (keyof State)[];
export declare type OrganiseFunction<E extends Element> = {
    filter?: (element: E) => boolean;
    sort?: (a: E, b: E) => number;
};
export declare type OrganiserName = string;
export declare type OrganiseFunctions<E extends Element, O extends OrganiserName> = {
    [Key in O]: OrganiseFunction<E>;
};
