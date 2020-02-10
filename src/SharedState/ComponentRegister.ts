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
    this.map = new Map<RegisterKey, UpdateFunction<S>>();
  }

  register(
    registerKey: RegisterKey,
    updateKeys: UpdateKeys<S>,
    reRenderComponent: () => void,
  ) {
    const updateKeysArray = toArray(updateKeys);

    function onUpdate(updateProps: Partial<S> | true) {
      if (
        updateProps === true ||
        Object.keys(updateProps).some(key => updateKeysArray.includes(key))
      ) {
        reRenderComponent();
      }
    }

    this.map.set(registerKey, onUpdate);
  }

  update(updateProps: Partial<S> | true) {
    this.map.forEach(onUpdate => onUpdate(updateProps));
  }

  unregister(registerKey: RegisterKey) {
    this.map.delete(registerKey);
  }
}
