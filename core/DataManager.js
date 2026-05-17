/**
 * DataManager — central registry for all game objects.
 *
 * Singleton instance exported as `dataManager`. Handles object creation,
 * retrieval, registration, and save/load serialization.
 */

import { objectRegistry } from './ObjectRegistry.js';
import { renderer } from '../rendering/Renderer.js';



class DataManager {
    constructor() {
        this.rootObject = null;
        /** Plain object keyed by ID — serialized directly to JSON on save. */
        this.states = {};
        /** Runtime-only cache of live objects — never serialized. */
        this.objects = new Map();

        this.createSaveButton();
        this.createLoadButton();
    }

    createObject(state) {
        let newObject = objectRegistry.create(state);
        
        return newObject;
    }

    getObject(id) {
        if(id == -1) {
            return null;
        } else if(id >= 0) {
            if(this.objects.has(id)) {
                return this.objects.get(id);
            } else {
                return objectRegistry.create(this.states[id]);
            }
        } else {
            console.log("ERROR: Unkown object id: "+id);
        }
    }

    registerObject(object) {
        this.states[object.state.objectId] = object.state;
        this.objects.set(object.state.objectId, object);
    }

    createSaveButton() {
        document.getElementById("menu-save").addEventListener("click", this.save.bind(this));
    }

    createLoadButton() {
        this.fileInput = document.createElement("input");
        this.fileInput.type = "file";
        this.fileInput.addEventListener("change", this.handleFile.bind(this));
        this.fileInput.style.display = "none";
        this.fileInput.id = "fileInput";
        let fileInputLabel = document.createElement("label");
        fileInputLabel.setAttribute("for", "fileInput");
        fileInputLabel.style.display = "block";
        fileInputLabel.innerHTML = "Load";
        document.getElementById("menu-load").appendChild(this.fileInput);
        document.getElementById("menu-load").appendChild(fileInputLabel);
    }

    handleFile() {
        const reader = new FileReader();
        reader.addEventListener("load", (event) => {
            const result = event.target.result;

            this.restoreData(JSON.parse(result));
        });
        reader.readAsText(this.fileInput.files[0]);
    }

    /**
     * Restore game state from a parsed save file.
     *
     * IMPORTANT: renderer.clear() must be called before recreating objects.
     * Without it, stale Renderer render nodes from the previous session persist
     * and active transitions would leak event listeners.
     */
    restoreData(data) {
        this.states = {};
        this.objects = new Map();
        objectRegistry.numObjects = 0;

        renderer.clear();
        this.rootObject.clearAll();
        
        this.states = data.states;
        this.rootObject = this.createObject(this.states[data.rootObject]);

        this.fileInput.value = null;
    }

    save() {
        let data = this.gatherData()      
        let json = JSON.stringify(data);

        this.downloadFile(json);
    }
    gatherData() {
        let data = {
            version: 0,
            rootObject: this.rootObject.state.objectId,
            states: this.states
        }

        return data;
    }

    downloadFile(json) {
        let blob = new Blob([json], {type: "application/json"});
        let url  = URL.createObjectURL(blob);
        
        let a = document.createElement('a');
        a.href        = url;
        a.download    = "gemaeuer.json";
        a.textContent = "Download gemaeuer.json";
        a.click();
        URL.revokeObjectURL(url);      
    }
}

export const dataManager = new DataManager();
