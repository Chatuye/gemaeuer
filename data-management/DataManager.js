class DataManager {
    constructor() {
        this.dataObjects = new Map();
        this.objects = new Map();
        this.objectFactory = new ObjectFactory();

        this.createSaveButton();
        this.createLoadButton();
    }

    createObject(dataObject) {
        let newObject = this.objectFactory.createObject(dataObject);
        
        return newObject;
    }

    getObject(id) {
        if(id == -1) {
            return null;
        } else if(id >= 0) {
            if(this.objects.has(id)) {
                return this.objects.get(id);
            } else {
                return this.objectFactory.createObject(this.dataObjects.get(id));
            }
        } else {
            console.log("ERROR: Unkown object id: "+id);
        }
    }

    registerObject(object) {
        this.dataObjects.set(object.dataObject.objectId, object.dataObject)
        this.objects.set(object.dataObject.objectId, object);
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
        this.dataObjects = new Map();
        this.objects = new Map();
        this.objectFactory = new ObjectFactory();

        rootObject.clearAll();
        
        this.dataObjects = data.dataObjects;
        rootObject = this.createObject(this.dataObjects.get(data.rootObject));


        this.fileInput.value = null;
    }

    save() {
        let data = this.gatherData()      
        let json = JSON.stringify(data, this.mapReplacer);

        this.downloadFile(json);
    }
    gatherData() {
        let data = {
            rootObject: rootObject.dataObject.objectId,
            dataObjects: this.dataObjects
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