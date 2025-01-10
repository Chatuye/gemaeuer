class StageCoordinate {
    constructor(stage, callback) {
        this.stage = stage;
        this.callback = callback;

        this.baseX = 0;
        this.baseY = 0;
        this.stageX = 0;
        this.stageY = 0;
    }

    updateBaseValues(x, y) {
        this.baseX = x;
        this.baseY = y;
        this.calculateStageValues();

        this.callback();
    }

    updateStageValues(x, y) {
        this.stageX = x;
        this.stageY = y;
        this.calculateBaseValues();

        this.callback();
    }

    calculateBaseValues() {
        this.baseX = Math.round(this.stageX / this.stage.scaleX);
        this.baseY = Math.round(this.stageY / this.stage.scaleY);
    }

    calculateStageValues() {
        this.stageX = Math.round(this.baseX * this.stage.scaleX);
        this.stageY = Math.round(this.baseY * this.stage.scaleY);
    }

    onStageResize() {
        this.calculateStageValues();
        this.callback();
    }
}