import { Card } from '../game/Card.js';
import { Deck } from '../game/Deck.js';
import { GameStage } from '../game/GameStage.js';
import { Hand } from '../game/Hand.js';
import { Tile } from '../game/Tile.js';
import { RootObject } from '../zui/rootObject.js';
import { StageZIndexManager } from '../zui/StageZIndexManager.js';
import { ViewPort } from '../zui/ViewPort.js';



export class ObjectFactory {
    constructor() {
        this.numObjects = 0;
    }

    createObject(stateObject) {
        if(stateObject.objectId == -1) {
			stateObject.objectId = this.numObjects;
		}
        this.numObjects += 1;

        switch(stateObject.objectType) {
			case "CARD":
				return new Card(stateObject);
			case "DECK":
				return new Deck(stateObject);
			case "GAMESTAGE":
				return new GameStage(stateObject);
			case "HAND":
				return new Hand(stateObject);
			case "ROOTOBJECT":
				return new RootObject(stateObject);
			case "STAGEZINDEXMANAGER":
				return new StageZIndexManager(stateObject);
			case "TILE":
				return new Tile(stateObject);
			case "VIEWPORT":
				return new ViewPort(stateObject);
			default:
				console.log("ERROR: Unknown object type: "+stateObject.objectType);
                return null;
		}
    }
}
