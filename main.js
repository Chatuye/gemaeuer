import { svgLoader } from './assets/SVGLoader.js';
import { dataManager } from './core/DataManager.js';
import './core/registry.js';
import { RootObjectSO } from './zui/rootObject.js';



function onBodyLoad() {
	svgLoader.loadAll(onSVGsLoaded);
}

function onSVGsLoaded() {
	let rootObjectSO = new RootObjectSO();
	dataManager.rootObject = dataManager.createObject(rootObjectSO);
}


window.addEventListener('DOMContentLoaded', onBodyLoad);
