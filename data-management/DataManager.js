class DataManager {
    constructor() {
        this.objectCounter = 0;

        this.createSave();
        this.createLoad();
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
        const fileList = this.fileInput.files;
        console.log("FileList: "+fileList.length);

        const reader = new FileReader();
        reader.addEventListener('load', (event) => {
            const result = event.target.result;
            console.log(result);

            let viewPort = objectFactory.create(JSON.parse(result));
            
            stage.viewPort = viewPort;
            viewPort.setParent(stage);
            stage.onParentChange();
        });
        reader.readAsText(this.fileInput.files[0]);
    }

    save() {
        console.log("Prepare download...");

        let myDataObject = this.gatherData();

        let json = JSON.stringify(myDataObject, this.mapReplacer);

        this.downloadFile(json);
    }

    gatherData() {
        let myData = {stageRoot: stage.viewPort.dataObject.objectId, stageObjects: new Map(), other: 5}

        myData.stageObjects.set(stage.viewPort.dataObject.objectId, stage.viewPort.dataObject);
        myData.stageObjects.set(5, {});
        console.log(myData.stageObjects)

        return myData;
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