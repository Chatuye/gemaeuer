class DataManager {
    constructor() {
        this.dataObjects = new Map();
        this.objects = new Map();
        this.objectFactory = new ObjectFactory();

        this.createSave();
        this.createLoad();
    }

    createObject(dataObject) {
        let newObject = this.objectFactory.createObject(dataObject);
        
        return newObject;
    }

    getObject(id) {
        console.log("PEEP "+id)

        if(id == "mainBody") 
            return mainBody
        else if(id >= 0)
            if(this.objects.has(id)) {
                return this.objects.get(id);
            } else {
                return this.objectFactory.createObject(this.dataObjects.get(id));
            }
        else
            console.log("ERROR: Unkown object id: "+id);
    }

    registerObject(object) {
        this.dataObjects.set(object.dataObject.objectId, object.dataObject)
        this.objects.set(object.dataObject.objectId, object);
    }

    createSave() {
        let div = document.createElement('div');
        div.innerHTML = "Save";
        div.className = "Button";
        div.addEventListener("click", this.save.bind(this));
        mainBody.appendChild(div);
    }

    createLoad() {
        let div = document.createElement('div');
        this.fileInput = document.createElement('input');
        this.fileInput.type = "file";
        this.fileInput.addEventListener("change", this.handleFile.bind(this))
        div.style.left = "40px";
        div.appendChild(this.fileInput);
        mainBody.appendChild(div);
    }

    handleFile() {
        //const fileList = this.fileInput.files;
        //console.log("FileList: "+fileList.length);

        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            const result = event.target.result;
            //console.log(result);

            this.restoreData(JSON.parse(result, this.mapReviver));
        });
        reader.readAsText(this.fileInput.files[0]);
    }

    restoreData(data) {
        //console.log(data);
        this.dataObjects = new Map();
        this.objects = new Map();
        this.objectFactory = new ObjectFactory();
        mainBody.removeChild(stage.div);
        this.dataObjects = data.dataObjects;

        stage = this.createObject(this.dataObjects.get(data.mainStage));
        stage.div.className = "Stage";    
    }

    save() {
        console.log("Prepare download...");
        let data = this.gatherData()      
        let json = JSON.stringify(data, this.mapReplacer);

        this.downloadFile(json);
    }
    gatherData() {
        let data = {
            mainStage: stage.dataObject.objectId,
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
        //document.getElementById("mainBody").appendChild(a);        
    }
}