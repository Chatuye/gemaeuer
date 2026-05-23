/**
 * SVGLoader — parses and caches SVG assets as DOM elements.
 *
 * Singleton instance exported as `svgLoader`. Call `svgLoader.loadAll()`
 * once at startup to parse all registered SVG data. After that, use
 * `clone(key)` to get a fresh copy of any SVG, or `getDimensions(key)`
 * to read its intrinsic size.
 */

import * as svgData from './svgData/index.js';



class SVGLoader {
    constructor() {
        this.svgs = {};
    }

    /** Parses all SVGs from svgData and invokes callback when done. */
    loadAll(callback) {
        for (let key in svgData) {
            this.load(key);
        }
        callback();
    }

    load(key) {
        let mySVGParent = document.createElement("div");
        mySVGParent.innerHTML = svgData[key];
        this.svgs[key] = mySVGParent.firstElementChild;
    }

    /** Returns the intrinsic {width, height} of the SVG registered under key. */
    getDimensions(key) {
        return {
            width: Number(this.svgs[key].getAttribute("width")),
            height: Number(this.svgs[key].getAttribute("height"))
        };
    }

    /** Returns a deep clone of the SVG element registered under key. */
    clone(key) {
        return this.svgs[key].cloneNode(true);
    }
}

export const svgLoader = new SVGLoader();
