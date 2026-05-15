/**
 * EventBus — global mediator for decoupled communication.
 *
 * Usage:
 *   import { eventBus } from '../core/EventBus.js';
 *
 *   // Subscribe
 *   eventBus.on('card:drawn', ({ card }) => { ... });
 *
 *   // Emit
 *   eventBus.emit('card:drawn', { card });
 *
 *   // Unsubscribe
 *   eventBus.off('card:drawn', handler);
 */

export class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} eventName — the event to listen for
     * @param {function} callback — called with the event payload when emitted
     */
    on(eventName, callback) {
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(callback);
    }

    /**
     * Unsubscribe a previously registered callback.
     * @param {string} eventName — the event to stop listening for
     * @param {function} callback — the exact function reference passed to on()
     */
    off(eventName, callback) {
        const callbacks = this.listeners[eventName];
        if (!callbacks) return;
        this.listeners[eventName] = callbacks.filter(cb => cb !== callback);
    }

    /**
     * Emit an event, calling all registered listeners synchronously.
     * @param {string} eventName — the event to fire
     * @param {*} data — payload passed to each listener
     */
    emit(eventName, data) {
        const callbacks = this.listeners[eventName];
        if (!callbacks) return;
        for (const cb of callbacks) {
            cb(data);
        }
    }
}

export const eventBus = new EventBus();
