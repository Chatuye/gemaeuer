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

    /**
     * Get an already-live object by ID. Returns null if the ID is -1 or
     * the object hasn't been created yet. Use this for runtime lookups
     * where the object is expected to exist.
     */
    getObject(id) {
        if(id == -1) {
            return null;
        } else if(id >= 0) {
            return this.objects.get(id) ?? null;
        } else {
            console.log("ERROR: Unknown object id: "+id);
            return null;
        }
    }

    /**
     * Hydrate an object from saved state. If the object is already live,
     * returns it. Otherwise constructs it from the serialized state.
     * Use this during save/load restoration when objects may not yet exist.
     */
    hydrateObject(id) {
        if(id == -1) {
            return null;
        } else if(id >= 0) {
            if(this.objects.has(id)) {
                return this.objects.get(id);
            } else {
                return objectRegistry.create(this.states[id]);
            }
        } else {
            console.log("ERROR: Unknown object id: "+id);
            return null;
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

        this.rootObject.destroy();
        renderer.clear();
        
        this.states = data.states;
        objectRegistry.numObjects = Math.max(...Object.keys(this.states).map(Number)) + 1;
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
