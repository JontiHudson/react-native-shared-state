export function getError(code, additionalFields = {}) {
  const error = new Error(JSON.stringify({ ...additionalFields, code }));
  console.error({ ...additionalFields, code });
  return error;
}

export function deepClone(object) {
  try {
    const objectCopy = {};

    for (const key in object) {
      const value = object[key];

      if (Array.isArray(value)) {
        objectCopy[key] = Object.values(deepClone({ ...value }));
      } else if (value instanceof Object) {
        objectCopy[key] = deepClone(value);
      } else {
        objectCopy[key] = value;
      }
    }

    return objectCopy;
  } catch (err) {
    throw getError('DEEP_CLONE_ERROR', {
      err,
    });
  }
}
