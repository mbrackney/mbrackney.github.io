// This is a JavaScript module that is loaded on demand. It can export any number of
// functions, and may import other JavaScript modules if required.


export class ObserverManager {

    /**
     * Generate a Guid v4 (RFC4122)
     * 
     * Using code from https://stackoverflow.com/a/2117523
     * @returns {string} new Guid
     */
    static #GetGuid() {
        if (crypto?.randomUUID != null) return crypto.randomUUID();
        return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
            (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
        );
    }

    static ActiveResizeObservers = {};

    /**
     * Register a resize observer
     * @param {string} id
     * @param {object} dotNetRef
     * @param {...Element} els
     * @returns {string[]} Generated ids for the tracked elements in the same order as the given elements 
     */
    static CreateNewResizeObserver(id, dotNetRef, ...els) {
        let callback = (entries, obsCallback) => {
            let dotNetArguments = [];
            for (let entry of entries) {
                dotNetArguments.push(this.#CreateDotNetCallbackObject(entry, id))
            }
            dotNetRef.invokeMethodAsync("Execute", dotNetArguments);
        }
        let obs = new ResizeObserver(callback)
        let ids = [];

        for (let el of els) {
            let elementTrackingId = this.#GetGuid();
            el.setAttribute(this.#GetResizeTrackingAttributeName(id), elementTrackingId);
            ids.push(elementTrackingId);
            obs.observe(el);
        }
        this.ActiveResizeObservers[id] = obs;
        return ids;
    }

    /**
    * Disconnect and delete a resize observer
    * @param {string} observerId
    */
    static RemoveResizeObserver(observerId) {
        if (!this.ActiveResizeObservers[observerId]) return;
        this.ActiveResizeObservers[observerId].disconnect();
        delete this.ActiveResizeObservers[observerId];
    }

    /**
     * Add a new element to an existing observer
     * @param {string} observerId
     * @param {Element} element
     */
    static StartObserving(observerId, element) {

        if (!this.ActiveResizeObservers[observerId]) return null;
        let obs = this.ActiveResizeObservers[observerId];
        let elementTrackingId = this.#GetGuid();
        element.setAttribute(this.#GetResizeTrackingAttributeName(observerId), elementTrackingId);
        obs.observe(element);
        return elementTrackingId;
    }

    /**
     * Add a new element to an existing observer
     * @param {string} observerId
     * @param {Element} element
     */
    static StopObserving(observerId, element) {
        if (!this.ActiveResizeObservers[observerId]) return false;
        let obs = this.ActiveResizeObservers[observerId];
        obs.unobserve(element);
        element.removeAttribute(this.#GetResizeTrackingAttributeName(observerId));
        return true;
    }

    /**
     * Generate serializable object for DotNET
     * @param {ResizeObserverEntry} callbackEl
     * @param {string} observerId
     * @returns {object} Serialize object with all required info for dotNet
     */
    static #CreateDotNetCallbackObject(callbackEl, observerId) {
        let result = {};
        result.borderBoxSize = this.#ConvertResizeObserverSizeObject(callbackEl.borderBoxSize[0]);
        result.contentBoxSize = this.#ConvertResizeObserverSizeObject(callbackEl.contentBoxSize[0]);
        result.contentRect = callbackEl.contentRect;
        result.targetTrackingId = callbackEl.target.getAttribute(this.#GetResizeTrackingAttributeName(observerId));
        return result;
    }

    /**
     * Get the attribute name used to track elements belonging to a specific observer
     * @param {string} observerId
     */
    static #GetResizeTrackingAttributeName(observerId) {
        return `ResizeElementTrackingId-${observerId}`;
    }

    /**
     * Convert a ResizeObserverSize object to a serializable object
     * @param {ResizeObserverSize} [input]
     * @return {object}
     */
    static #ConvertResizeObserverSizeObject(input) {
        let result = {};
        result.blockSize = input?.blockSize ?? 0;
        result.inlineSize = input?.inlineSize ?? 0;
        return result;
    }

}