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

    addButton(label, onClick) {
        this.add({ type: "button", label, onClick });
    }

    addInput(label, value, onChange) {
        this.add({ type: "input", label, value, onChange });
    }

    addDiv(div) {
        this.add({ type: "div", div });
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
        } else if (item.type === "button") {
            const el = document.createElement("button");
            el.style.position = "static";
            el.textContent = item.label;
            el.style.padding = "6px 12px";
            el.style.border = "1px solid rgba(255, 255, 255, 0.3)";
            el.style.borderRadius = "6px";
            el.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            el.style.color = "rgba(255, 255, 255, 0.9)";
            el.style.fontFamily = "Roboto, sans-serif";
            el.style.fontSize = "14px";
            el.style.cursor = "pointer";
            el.addEventListener("mousedown", (e) => e.stopPropagation());
            el.addEventListener("click", item.onClick);
            this.contentDiv.appendChild(el);
        } else if (item.type === "div") {
            item.div.style.position = "static";
            this.contentDiv.appendChild(item.div);
        } else if (item.type === "input") {
            const row = document.createElement("div");
            row.style.position = "static";
            row.style.display = "flex";
            row.style.alignItems = "center";
            row.style.gap = "8px";

            const label = document.createElement("span");
            label.style.color = "rgba(255, 255, 255, 0.9)";
            label.style.fontFamily = "Roboto, sans-serif";
            label.style.fontSize = "14px";
            label.style.minWidth = "50px";
            label.textContent = item.label;

            const input = document.createElement("input");
            input.type = "text";
            input.value = item.value;
            input.style.flex = "1";
            input.style.padding = "4px 8px";
            input.style.border = "1px solid rgba(255, 255, 255, 0.3)";
            input.style.borderRadius = "4px";
            input.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            input.style.color = "rgba(255, 255, 255, 0.9)";
            input.style.fontFamily = "Roboto, sans-serif";
            input.style.fontSize = "14px";
            input.style.outline = "none";
            input.addEventListener("mousedown", (e) => e.stopPropagation());
            input.addEventListener("keydown", (e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                    input.blur();
                }
            });
            input.addEventListener("blur", () => {
                item.onChange(input.value);
            });

            row.appendChild(label);
            row.appendChild(input);
            this.contentDiv.appendChild(row);
        }
    }
}

objectRegistry.register("PANEL", Panel);
