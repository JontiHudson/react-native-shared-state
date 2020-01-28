import { deepClone } from '../helpers';
import { Element, Map } from '../types';
import { StateCache } from '../SharedState/StateCache';

export class MapCache<E extends Element, K extends keyof E> extends StateCache<
  Map<E>
> {
  defaultElements: E[];
  key: K;

  constructor(defaultElements: E[], key: K) {
    super({});

    this.defaultElements = defaultElements;
    this.key = key;

    this.add(defaultElements);

    this.default = deepClone(this.current);
  }

  add(newElements: E[]) {
    const updatedElements: Map<E> = {};

    newElements.forEach(element => {
      if (super.updateProp(element[this.key], element)) {
        updatedElements[element[this.key]] = element;
      }
    });

    return updatedElements;
  }

  remove(removeElements: E[K][]) {
    let updated = false;

    removeElements.forEach(key => {
      if (super.updateProp(key, undefined)) {
        updated = true;
      }
    });
    return updated;
  }
}
