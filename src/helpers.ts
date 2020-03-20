import { useState, useLayoutEffect, useRef } from 'react';
import ExtendedError from 'extended_err';

export function deepClone<O extends Object>(object: O): O {
  try {
    const objectCopy = {};

    for (const key in object) {
      const value = object[key];

      if (Array.isArray(value)) {
        // @ts-ignore
        objectCopy[key] = Object.values(deepClone({ ...value }));
      } else if (value?.constructor.name === 'Object') {
        // @ts-ignore
        objectCopy[key] = deepClone(value);
      } else {
        // @ts-ignore
        objectCopy[key] = value;
      }
    }

    // @ts-ignore
    return objectCopy;
  } catch (error) {
    throw ExtendedError.transform(error, {
      name: 'State Error',
      code: 'DEEP_CLONE_ERROR',
      message: 'Unable to deep clone object',
      severity: 'HIGH',
    });
  }
}

export function toArray<D>(data: D | D[]): D[] {
  if (Array.isArray(data)) {
    return data;
  }
  return [data];
}

export function onMount(mountFunction: () => void) {
  useLayoutEffect(() => {
    mountFunction();
  }, []);
}

export function onUnMount(unMountFunction: () => void) {
  useLayoutEffect(() => unMountFunction, []);
}

function useIsMounted() {
  const isMounted = useRef(null);

  onMount(() => {
    isMounted.current = true;
  });
  onUnMount(() => {
    isMounted.current = false;
  });

  return isMounted;
}

export function useReRender() {
  const isMounted = useIsMounted();
  const setState = useState({})[1];

  return () => isMounted.current && setState({});
}
