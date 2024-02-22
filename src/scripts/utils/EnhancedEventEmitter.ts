/**
 * A slightly hacky/modified version of the EventEmitter!
 *
 * @module
 */

import { EventEmitter, Listener } from 'events';

/**
 * A slightly hacky/modified version of the EventEmitter!
 *
 * Essentially, the class will keep track of the callback return values (if any) associated
 * with an Event Listener and returned when `emit` is called.
 */
export class EnhancedEventEmitter extends EventEmitter {
  /**
   * Disables Adding any more Listeners.
   *
   * This is useful for ensuring a registration phase in your Application Lifecycle.
   *
   * If set to `true`, all attempts to call `addListener` or `on` will result in an `Error`!
   */
  disableAddingListeners = false;

  private _storeListenersMap: Record<string, [Listener, Listener][]> = {};
  private _storeValuesMap: Record<string, [Listener, any][]> = {};

  /**
   * Override of the original `addListener`, but with a custom internal listener added to store
   * callback return values for retrieval later.
   *
   * @param type - Name/ID of the Event to Listen for triggers.
   * @param listener - Callback Listener for the event.
   * @throws Error - The EventEmitter is marked as disallowing adding new Listeners.
   */
  override addListener = (type: string | number, listener: Listener): this => {
    if (true === this.disableAddingListeners) {
      throw new Error('The EventEmitter is marked as disallowing adding new Listeners!');
    }

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

  /**
   * Override of the original `removeListener`, but also removes a custom internal listener mapped to the
   * originall callback function.
   *
   * @param type - Name/ID of the Event to stop Listening for triggers.
   * @param listener - Callback Listener for the event.
   */
  override removeListener = (type: string | number, listener: Listener): this => {
    const calledValues = this._storeValuesMap[type] ?? [];
    const listeners = this._storeListenersMap[type] ?? [];

    // Loop through all of the stored values and remove if the listener matches the incoming listener
    for (let idx = calledValues.length - 1; idx >= 0; idx--) {
      const [storedListener] = calledValues[idx];

      if (storedListener === listener) {
        calledValues.splice(idx, 1);
      }
    }

    // Loop through all the listeners and remove from internal map, as well as call `super`
    for (let idx = listeners.length - 1; idx >= 0; idx--) {
      const [storedListener, newListener] = listeners[idx];

      if (storedListener === listener) {
        listeners.splice(idx, 1);

        super.removeListener(type, newListener);
      }
    }

    // If we removed the last of the type, clean up maps...

    if (this._storeValuesMap[type] && 0 === this._storeValuesMap[type].length) {
      delete this._storeValuesMap[type];
    }

    if (this._storeListenersMap[type] && 0 === this._storeListenersMap[type].length) {
      delete this._storeListenersMap[type];
    }

    return this;
  };

  /**
   * Emit an event, and get all the return values of all Listeners registered!
   * This is hacky, and should only be used by someone aware of the implications of relying on this
   * to return the correct/desired data!
   *
   * @typeParam ReturnType - The expected return type of the Listeners.
   * @param type - Name/ID of the Event to trigger.
   * @param args - Arguments Payload to send along with the Event.
   * @returns Array of resposes from callback Listeners.
   */
  call = <ReturnType>(type: string | number, ...args: any[]): ReturnType[] => {
    this._storeValuesMap[type] = [];

    this.emit(type, args);

    const values = this._storeValuesMap[type].map(entry => entry[1]) as ReturnType[];

    // Prevent memory leaks by removing the listener from the value mapping
    // This should GC values that are complex object types, if applicable
    setTimeout(() => {
      this._storeValuesMap[type] = [];
    }, 0);

    return values;
  };

  /**
   * Override of the original `removeAllListeners`, but it also deletes map data as necessary.
   *
   * @param type - Name/ID of the Event to remove, or leave empty to remove ALL Event types.
   */
  override removeAllListeners(type?: string | number): this {
    if (type) {
      delete this._storeValuesMap[type];
      delete this._storeListenersMap[type];
    } else {
      this._storeValuesMap = {};
      this._storeListenersMap = {};
    }

    return super.removeAllListeners();
  }
}
