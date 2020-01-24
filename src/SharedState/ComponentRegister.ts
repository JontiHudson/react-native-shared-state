import { toArray } from '../helpers';
import { State, UpdateKeys } from '../types';

type RegisterKey = React.Component | Symbol;
type UpdateFunction<S extends State> = (
  updateProps: Partial<S> | true,
  unregisterIfNotUpdated?: boolean,
) => void;

export class ComponentRegister<S extends State> {
  map: Map<RegisterKey, UpdateFunction<S>>;

  constructor() {
    this.map = new Map();
  }

  register(
    registerKey: RegisterKey,
    updateKeys: UpdateKeys<S>,
    updateState: () => void,
  ) {
    const updateKeysArray = toArray(updateKeys);

    function onUpdate(
      updateProps: Partial<S> | true,
      unregisterIfNotUpdated?: boolean,
    ) {
      if (
        updateProps === true ||
        Object.keys(updateProps).some(key => updateKeysArray.includes(key))
      ) {
        updateState();
      } else if (unregisterIfNotUpdated) {
        this.unregister(registerKey);
      }
    }

    this.map.set(registerKey, onUpdate);
  }

  update(updateProps: Partial<S> | true, unregisterIfNotUpdated?: boolean) {
    this.map.forEach(onUpdate => onUpdate(updateProps, unregisterIfNotUpdated));
  }

  unregister(registerKey: RegisterKey) {
    this.map.delete(registerKey);
  }
}
