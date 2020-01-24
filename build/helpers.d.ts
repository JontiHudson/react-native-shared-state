export declare function deepClone<O extends Object>(object: O): O;
export declare function toArray<D>(data: D | D[]): D[];
export declare function onMount(mountFunction: () => void): void;
export declare function onUnMount(unMountFunction: () => void): void;
export declare function useReRender(): () => void;
