//

export function getError(code, additionalFields = {}) {
  const error = new Error(JSON.stringify({ ...additionalFields, code }));
  console.error({ ...additionalFields, code });
  return error;
}

export function deepClone(object) {
  try {
    const objectCopy = {};

    for (var key in object) {
      const value = object[key];

      if (Array.isArray(value)) {
        objectCopy[key] = Object.values(deepClone({ ...value }));
      } else if (value instanceof Object) {
        objectCopy[key] = deepClone(value);
      } else {
        objectCopy[key] = value;
      }
    }

    // $FlowFixMe
    return objectCopy;
  } catch (err) {
    throw getError("DEEP_CLONE_ERROR", {
      err
    });
  }
}
