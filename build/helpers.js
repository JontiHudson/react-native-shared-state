"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const extended_err_1 = require("extended_err");
function deepClone(object) {
    try {
        const objectCopy = {};
        for (const key in object) {
            const value = object[key];
            if (Array.isArray(value)) {
                // @ts-ignore
                objectCopy[key] = Object.values(deepClone({ ...value }));
            }
            else if (value instanceof Object) {
                // @ts-ignore
                objectCopy[key] = deepClone(value);
            }
            else {
                // @ts-ignore
                objectCopy[key] = value;
            }
        }
        // @ts-ignore
        return objectCopy;
    }
    catch (error) {
        throw extended_err_1.default.transform(error, {
            name: 'State Error',
            code: 'DEEP_CLONE_ERROR',
            message: 'Unable to deep clone object',
        });
    }
}
exports.deepClone = deepClone;
function toArray(data) {
    if (Array.isArray(data)) {
        return data;
    }
    return [data];
}
exports.toArray = toArray;
function onMount(mountFunction) {
    react_1.useEffect(() => {
        mountFunction();
    }, []);
}
exports.onMount = onMount;
function onUnMount(unMountFunction) {
    react_1.useEffect(() => unMountFunction, []);
}
exports.onUnMount = onUnMount;
function useIsMounted() {
    const isMounted = react_1.useRef(true);
    onUnMount(() => {
        isMounted.current = false;
    });
    return isMounted;
}
function useReRender() {
    const isMounted = useIsMounted();
    const setState = react_1.useState({})[1];
    return () => isMounted.current && setState({});
}
exports.useReRender = useReRender;
