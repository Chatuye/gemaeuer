import { dataManager } from '../core/DataManager.js';
import { undoManager } from '../core/UndoManager.js';
import { createGameStage } from '../game/GameStage.js';

export function initMenu() {
	document.getElementById("menu-new").addEventListener("click", () => {
		createGameStage(dataManager.rootObject);
		undoManager.init();
	});

	document.getElementById("menu-save").addEventListener("click", () => {
		dataManager.save();
	});

	const fileInput = document.getElementById("file-input");
	document.getElementById("menu-load").addEventListener("click", () => {
		fileInput.click();
	});
	fileInput.addEventListener("change", () => {
		const file = fileInput.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.addEventListener("load", (event) => {
			dataManager.restoreData(JSON.parse(event.target.result));
			undoManager.init();
			fileInput.value = null;
		});
		reader.readAsText(file);
	});
}
