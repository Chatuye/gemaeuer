/**
 * Registry barrel — imports all constructable classes so their
 * self-registration side effects run before any createObject() call.
 *
 * Import this file once in main.js (or equivalent entry point).
 */

import '../game/Card.js';
import '../game/Deck.js';
import '../game/GameStage.js';
import '../game/Hand.js';
import '../game/Tile.js';
import '../zui/Panel.js';
import '../zui/rootObject.js';
import '../zui/StageZIndexManager.js';
import '../zui/ViewPort.js';
