import { svgLoader } from './assets/SVGLoader.js';
import { dataManager } from './core/DataManager.js';
import './core/registry.js';
import { RootObjectState } from './zui/rootObject.js';



function onBodyLoad() {
	svgLoader.loadAll(onSVGsLoaded);
}

function onSVGsLoaded() {
	let rootObjectState = new RootObjectState();
	dataManager.rootObject = dataManager.createObject(rootObjectState);
}


window.addEventListener('DOMContentLoaded', onBodyLoad);
