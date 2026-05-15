/**
 * DataManager — central registry for all game objects.
 *
 * Singleton instance exported as `dataManager`. Handles object creation,
 * retrieval, registration, and save/load serialization.
 */

import { objectRegistry } from './ObjectRegistry.js';



class DataManager {
    constructor() {
        this.rootObject = null;
        this.states = new Map();
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
                return objectRegistry.create(this.states.get(id));
            }
        } else {
            console.log("ERROR: Unkown object id: "+id);
        }
    }

    registerObject(object) {
        this.states.set(object.state.objectId, object.state)
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

            this.restoreData(JSON.parse(result, this.mapReviver));
        });
        reader.readAsText(this.fileInput.files[0]);
    }

    restoreData(data) {
        this.states = new Map();
        this.objects = new Map();
        objectRegistry.numObjects = 0;

        this.rootObject.clearAll();
        
        this.states = data.states;
        this.rootObject = this.createObject(this.states.get(data.rootObject));

        this.fileInput.value = null;
    }

    save() {
        let data = this.gatherData()      
        let json = JSON.stringify(data, this.mapReplacer);

        this.downloadFile(json);
    }
    gatherData() {
        let data = {
            rootObject: this.rootObject.state.objectId,
            states: this.states
        }

        return data;
    }
    
    mapReplacer(key, value) {
        if(value instanceof Map) {
            return {
                dataType: 'Map',
                value: Array.from(value.entries())
            };
        } else {
            return value;
        }
    }
    mapReviver(key, value) {
        if(typeof value === 'object' && value !== null) {
            if (value.dataType === 'Map') {
                return new Map(value.value);
            }
        }
        return value;
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
