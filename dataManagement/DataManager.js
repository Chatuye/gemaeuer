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
        this.stateObjects = new Map();
        this.objects = new Map();

        this.createSaveButton();
        this.createLoadButton();
    }

    createObject(stateObject) {
        let newObject = objectRegistry.create(stateObject);
        
        return newObject;
    }

    getObject(id) {
        if(id == -1) {
            return null;
        } else if(id >= 0) {
            if(this.objects.has(id)) {
                return this.objects.get(id);
            } else {
                return objectRegistry.create(this.stateObjects.get(id));
            }
        } else {
            console.log("ERROR: Unkown object id: "+id);
        }
    }

    registerObject(object) {
        this.stateObjects.set(object.stateObject.objectId, object.stateObject)
        this.objects.set(object.stateObject.objectId, object);
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
        this.stateObjects = new Map();
        this.objects = new Map();
        objectRegistry.numObjects = 0;

        this.rootObject.clearAll();
        
        this.stateObjects = data.stateObjects;
        this.rootObject = this.createObject(this.stateObjects.get(data.rootObject));

        this.fileInput.value = null;
    }

    save() {
        let data = this.gatherData()      
        let json = JSON.stringify(data, this.mapReplacer);

        this.downloadFile(json);
    }
    gatherData() {
        let data = {
            rootObject: this.rootObject.stateObject.objectId,
            stateObjects: this.stateObjects
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
