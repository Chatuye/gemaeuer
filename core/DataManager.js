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

        this.rootObject.destroy();
        renderer.clear();
        
        this.states = data.states;
        this.rootObject = this.createObject(this.states[data.rootObject]);
    }

    save() {
        let data = this.gatherData();
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
