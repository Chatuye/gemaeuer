class StageDimensions {
    constructor(stage, callback) {
        this.stage = stage;
        this.callback = callback;

        this.baseWidth = 0;
        this.baseHeight = 0;
        this.stageWidth = 0;
        this.stageHeight = 0;
    }

    updateBaseValues(w, h) {
        this.baseWidth = w;
        this.baseHeight = h;
        this.calculateStageValues();
        this.callback();
    }

    updateStageValues(w, h) {
        this.stageWidth = w;
        this.stageHeight = h;
        this.calculateBaseValues();

        this.callback();
    }

    calculateBaseValues() {
        this.baseWidth = Math.round(this.stageWidth / this.stage.scale);
        this.baseHeight = Math.round(this.stageHeight / this.stage.scale);
    }

    calculateStageValues() {
        this.stageWidth = Math.round(this.baseWidth * this.stage.scale);
        this.stageHeight = Math.round(this.baseHeight * this.stage.scale);
    }

    onStageResize() {
        this.calculateStageValues();
        this.callback();
    }
}