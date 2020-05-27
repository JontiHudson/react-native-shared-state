import { toArray } from '../helpers';
import { State } from '../types';

import { StateCache } from './StateCache';

export class EventRegister<S extends State> {
  private stateCache: StateCache<S>;
  private subscribedEvents: Map<
    (keyof S)[],
    (current: S, prev: Partial<S>) => void
  >;

  constructor(stateCache: StateCache<S>) {
    this.stateCache = stateCache;
    this.subscribedEvents = new Map();
  }

  add(trigger: keyof S | (keyof S)[], callback: (current: S, prev: S) => void) {
    const triggerArray = toArray(trigger);
    this.subscribedEvents.set(triggerArray, callback);

    return () => this.subscribedEvents.delete(triggerArray);
  }

  run(updatedProps: Partial<S>) {
    this.subscribedEvents.forEach((callback, trigger) => {
      // @ts-ignore
      if (Object.keys(updatedProps).some((key) => trigger.includes(key))) {
        callback(this.stateCache.current, this.stateCache.prev);
      }
    });
  }
}
