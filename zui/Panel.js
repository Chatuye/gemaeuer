import { LayoutPresets } from './config/LayoutPresets.js';
import { ZoomableElementState, ZoomableElement } from './ZoomableElement.js';
import { objectRegistry } from '../core/ObjectRegistry.js';



export class PanelState extends ZoomableElementState {
    constructor() {
        super();
        this.objectType = "PANEL";

        // Default to SCREEN layout (fixed on screen, resolution-adaptive)
        Object.assign(this, LayoutPresets.SCREEN);

        // Default dimensions
        this.width = 300;
        this.height = 300;

        this.items = [];
    }
}

export class Panel extends ZoomableElement {
    constructor(state) {
        super(state);

        // Style the div — no SVG, just a styled container
        this.div.style.backgroundColor = "rgba(40, 40, 40, 0.85)";
        this.div.style.borderRadius = "16px";
        this.div.style.overflow = "hidden";
        this.div.style.padding = "12px";
        this.div.style.boxSizing = "border-box";

        // Content wrapper — static positioning so children flow normally
        this.contentDiv = document.createElement("div");
        this.contentDiv.style.position = "static";
        this.contentDiv.style.display = "flex";
        this.contentDiv.style.flexDirection = "column";
        this.contentDiv.style.gap = "8px";
        this.contentDiv.style.width = "100%";
        this.contentDiv.style.height = "100%";
        this.div.appendChild(this.contentDiv);

        // Render any items already in state (e.g. from a save file)
        for (const item of this.state.items) {
            this._renderItem(item);
        }
    }

    add(item) {
        this.state.items.push(item);
        this._renderItem(item);
    }

    remove(item) {
        let index = this.state.items.indexOf(item);
        if (index === -1) return;
        this.state.items.splice(index, 1);
        this.contentDiv.removeChild(this.contentDiv.children[index]);
    }

    removeAll() {
        this.state.items.length = 0;
        this.contentDiv.innerHTML = "";
    }

    addText(text) {
        this.add({ type: "text", value: text });
    }

    _renderItem(item) {
        if (item.type === "text") {
            const el = document.createElement("div");
            el.style.position = "static";
            el.textContent = item.value;
            el.style.color = "rgba(255, 255, 255, 0.9)";
            el.style.fontFamily = "Roboto, sans-serif";
            el.style.fontSize = "14px";
            this.contentDiv.appendChild(el);
        }
    }
}

objectRegistry.register("PANEL", Panel);
