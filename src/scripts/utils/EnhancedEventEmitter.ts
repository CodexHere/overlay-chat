import { EventEmitter, Listener } from 'events';

export class EnhancedEventEmitter extends EventEmitter {
  _storeListenersMap: Record<string, [Listener, Listener][]> = {};
  _storeValuesMap: Record<string, [Listener, any][]> = {};

  override addListener = (type: string | number, listener: Listener): this => {
    const newListener = (...args: any[]) => {
      this._storeValuesMap[type] = this._storeValuesMap[type] ?? [];
      const val = listener.apply(listener, args);
      this._storeValuesMap[type].push([listener, val]);
    };

    this._storeListenersMap[type] = this._storeListenersMap[type] ?? [];
    this._storeListenersMap[type].push([listener, newListener]);
    super.addListener(type, newListener);

    return this;
  };

  override removeListener = (type: string | number, listener: Listener): this => {
    const calledValues = this._storeValuesMap[type] || [];
    const listeners = this._storeListenersMap[type] || [];

    for (let idx = calledValues.length - 1; idx >= 0; idx--) {
      const [storedListener] = calledValues[idx];

      if (storedListener === listener) {
        calledValues.splice(idx, 1);
      }
    }

    for (let idx = listeners.length - 1; idx >= 0; idx--) {
      const [storedListener, newListener] = listeners[idx];

      if (storedListener === listener) {
        listeners.splice(idx, 1);

        super.removeListener(type, newListener);
      }
    }

    if (this._storeValuesMap[type] && 0 === this._storeValuesMap[type].length) {
      delete this._storeValuesMap[type];
    }

    if (this._storeListenersMap[type] && 0 === this._storeListenersMap[type].length) {
      delete this._storeListenersMap[type];
    }

    return this;
  };

  call = <T>(type: string | number, ...args: any[]): T[] => {
    this._storeValuesMap[type] = [];

    this.emit(type, args);

    const values = this._storeValuesMap[type].map(entry => entry[1]) as T[];

    // Prevent memory leaks by removing the listener from the value mapping
    // This should GC values that are complex object types, if applicable
    setTimeout(() => {
      this._storeValuesMap[type] = [];
    }, 0);

    return values;
  };

  override removeAllListeners(type?: string | number): this {
    if (type) {
      delete this._storeValuesMap[type];
      delete this._storeListenersMap[type];
    }

    return super.removeAllListeners(type);
  }
}
