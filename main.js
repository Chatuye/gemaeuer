import { svgLoader } from './assets/SVGLoader.js';
import { dataManager } from './core/DataManager.js';
import './core/registry.js';
import { RootObjectState } from './zui/rootObject.js';
import { renderer } from './rendering/Renderer.js';
import { initMenu } from './ui/MenuController.js';



function onBodyLoad() {
	svgLoader.loadAll(onSVGsLoaded);
}

function onSVGsLoaded() {
	let rootObjectState = new RootObjectState();
	dataManager.rootObject = dataManager.createObject(rootObjectState);

	renderer.start(document.getElementById('content'));
	initMenu();
}

window.addEventListener('DOMContentLoaded', onBodyLoad);
