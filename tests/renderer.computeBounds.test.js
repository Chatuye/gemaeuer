/**
 * Property Test: Layout computation correctness
 * **Validates: Requirements 3.1, 3.2, 3.4**
 *
 * Property statement:
 * For any registered object with any valid combination of layout preset fields
 * (positionBehaviour, positionType, dimensionsBehaviour, dimensionsType, scaleWithWindowSize),
 * state values (x, y, width, height), parent bounds, and viewport state, the Renderer's
 * `computeBounds` SHALL produce position and dimension values matching the formulas:
 *   ZOOM+ABSOLUTE position â†’ (state.val - vp.val) * vp.scale
 *   FIXED+ABSOLUTE â†’ state.val
 *   RELATIVE â†’ state.val * parent.bound
 *   ZOOM+ABSOLUTE dimension â†’ state.val * vp.scale
 *   FIXED+ABSOLUTE+scaleWithWindowSize â†’ state.val * uiScale
 */

import { computeBounds, getUIScale } from '../rendering/Renderer.js';
import { dataManager } from '../core/DataManager.js';

// --- Minimal assertion helper ---
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
    if (condition) {
        passed++;
    } else {
        failed++;
        failures.push(message);
    }
}

function assertApprox(actual, expected, message, epsilon = 1e-6) {
    const diff = Math.abs(actual - expected);
    if (diff < epsilon) {
        passed++;
    } else {
        failed++;
        failures.push(`${message} â€” expected: ${expected}, got: ${actual} (diff: ${diff})`);
    }
}

// --- Random generators ---
function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// --- Test helpers ---

/**
 * Create a mock renderNodes Map with a parent render node that has known bounds.
 */
function createRenderNodesWithParent(parentId, parentBounds) {
    const renderNodes = new Map();
    renderNodes.set(parentId, { bounds: parentBounds });
    return renderNodes;
}

/**
 * Create a mock render node for computeBounds testing.
 */
function createNode({ x, y, width, height, positionBehaviour, positionType, dimensionsBehaviour, dimensionsType, scaleWithWindowSize, parentId, viewportId }) {
    return {
        state: { x, y, width, height },
        layoutPreset: {
            positionBehaviour,
            positionType,
            dimensionsBehaviour,
            dimensionsType,
            scaleWithWindowSize: scaleWithWindowSize ?? false
        },
        parentId: parentId ?? null,
        viewportId: viewportId ?? null
    };
}

// --- Property Tests ---

const NUM_ITERATIONS = 100;

/**
 * **Validates: Requirements 3.1**
 * Test RELATIVE position: x = state.x * parentBounds.width, y = state.y * parentBounds.height
 */
function testRelativePosition() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const stateX = randomFloat(0, 1);
        const stateY = randomFloat(0, 1);
        const parentWidth = randomFloat(100, 2000);
        const parentHeight = randomFloat(100, 2000);
        const parentId = 1;

        const parentBounds = { x: randomFloat(0, 500), y: randomFloat(0, 500), width: parentWidth, height: parentHeight };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const node = createNode({
            x: stateX,
            y: stateY,
            width: randomFloat(0, 1),
            height: randomFloat(0, 1),
            positionBehaviour: 'FIXED',
            positionType: 'RELATIVE',
            dimensionsBehaviour: 'FIXED',
            dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: false,
            parentId,
            viewportId: null
        });

        const result = computeBounds(node, renderNodes);

        const expectedX = stateX * parentWidth;
        const expectedY = stateY * parentHeight;

        assertApprox(result.x, expectedX, `[RELATIVE pos iter ${i}] x: state.x(${stateX}) * parent.width(${parentWidth})`);
        assertApprox(result.y, expectedY, `[RELATIVE pos iter ${i}] y: state.y(${stateY}) * parent.height(${parentHeight})`);
    }
}

/**
 * **Validates: Requirements 3.1**
 * Test ZOOM+ABSOLUTE position: x = (state.x - vp.x) * vp.scaleX, y = (state.y - vp.y) * vp.scaleY
 */
function testZoomAbsolutePosition() {
    const originalGetObject = dataManager.getObject.bind(dataManager);

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const stateX = randomFloat(-5000, 5000);
        const stateY = randomFloat(-5000, 5000);
        const vpX = randomFloat(-2000, 2000);
        const vpY = randomFloat(-2000, 2000);
        const vpScaleX = randomFloat(0.1, 5);
        const vpScaleY = randomFloat(0.1, 5);
        const viewportId = 999;
        const parentId = 1;

        // Mock viewport object
        dataManager.getObject = (id) => {
            if (id === viewportId) {
                return { state: { x: vpX, y: vpY, scaleX: vpScaleX, scaleY: vpScaleY } };
            }
            return originalGetObject(id);
        };

        const parentBounds = { x: 0, y: 0, width: 1920, height: 1080 };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const node = createNode({
            x: stateX,
            y: stateY,
            width: randomFloat(10, 500),
            height: randomFloat(10, 500),
            positionBehaviour: 'ZOOM',
            positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'FIXED',
            dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: false,
            parentId,
            viewportId
        });

        const result = computeBounds(node, renderNodes);

        const expectedX = (stateX - vpX) * vpScaleX;
        const expectedY = (stateY - vpY) * vpScaleY;

        assertApprox(result.x, expectedX, `[ZOOM+ABS pos iter ${i}] x: (${stateX} - ${vpX}) * ${vpScaleX}`);
        assertApprox(result.y, expectedY, `[ZOOM+ABS pos iter ${i}] y: (${stateY} - ${vpY}) * ${vpScaleY}`);
    }

    // Restore original
    dataManager.getObject = originalGetObject;
}

/**
 * **Validates: Requirements 3.1**
 * Test FIXED+ABSOLUTE position: x = state.x, y = state.y
 */
function testFixedAbsolutePosition() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const stateX = randomFloat(-1000, 1000);
        const stateY = randomFloat(-1000, 1000);
        const parentId = 1;

        const parentBounds = { x: randomFloat(0, 500), y: randomFloat(0, 500), width: randomFloat(100, 2000), height: randomFloat(100, 2000) };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const node = createNode({
            x: stateX,
            y: stateY,
            width: randomFloat(10, 500),
            height: randomFloat(10, 500),
            positionBehaviour: 'FIXED',
            positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'FIXED',
            dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: false,
            parentId,
            viewportId: null
        });

        const result = computeBounds(node, renderNodes);

        assertApprox(result.x, stateX, `[FIXED+ABS pos iter ${i}] x should equal state.x(${stateX})`);
        assertApprox(result.y, stateY, `[FIXED+ABS pos iter ${i}] y should equal state.y(${stateY})`);
    }
}

/**
 * **Validates: Requirements 3.2**
 * Test RELATIVE dimensions: width = state.width * parentBounds.width, height = state.height * parentBounds.height
 */
function testRelativeDimensions() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const stateWidth = randomFloat(0, 1);
        const stateHeight = randomFloat(0, 1);
        const parentWidth = randomFloat(100, 2000);
        const parentHeight = randomFloat(100, 2000);
        const parentId = 1;

        const parentBounds = { x: 0, y: 0, width: parentWidth, height: parentHeight };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const node = createNode({
            x: randomFloat(0, 1),
            y: randomFloat(0, 1),
            width: stateWidth,
            height: stateHeight,
            positionBehaviour: 'FIXED',
            positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'FIXED',
            dimensionsType: 'RELATIVE',
            scaleWithWindowSize: false,
            parentId,
            viewportId: null
        });

        const result = computeBounds(node, renderNodes);

        const expectedWidth = stateWidth * parentWidth;
        const expectedHeight = stateHeight * parentHeight;

        assertApprox(result.width, expectedWidth, `[RELATIVE dim iter ${i}] width: state.width(${stateWidth}) * parent.width(${parentWidth})`);
        assertApprox(result.height, expectedHeight, `[RELATIVE dim iter ${i}] height: state.height(${stateHeight}) * parent.height(${parentHeight})`);
    }
}

/**
 * **Validates: Requirements 3.2**
 * Test ZOOM+ABSOLUTE dimensions: width = state.width * vp.scaleX, height = state.height * vp.scaleY
 */
function testZoomAbsoluteDimensions() {
    const originalGetObject = dataManager.getObject.bind(dataManager);

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const stateWidth = randomFloat(10, 500);
        const stateHeight = randomFloat(10, 500);
        const vpScaleX = randomFloat(0.1, 5);
        const vpScaleY = randomFloat(0.1, 5);
        const viewportId = 999;
        const parentId = 1;

        dataManager.getObject = (id) => {
            if (id === viewportId) {
                return { state: { x: 0, y: 0, scaleX: vpScaleX, scaleY: vpScaleY } };
            }
            return originalGetObject(id);
        };

        const parentBounds = { x: 0, y: 0, width: 1920, height: 1080 };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const node = createNode({
            x: randomFloat(-5000, 5000),
            y: randomFloat(-5000, 5000),
            width: stateWidth,
            height: stateHeight,
            positionBehaviour: 'ZOOM',
            positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'ZOOM',
            dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: false,
            parentId,
            viewportId
        });

        const result = computeBounds(node, renderNodes);

        const expectedWidth = stateWidth * vpScaleX;
        const expectedHeight = stateHeight * vpScaleY;

        assertApprox(result.width, expectedWidth, `[ZOOM+ABS dim iter ${i}] width: state.width(${stateWidth}) * vp.scaleX(${vpScaleX})`);
        assertApprox(result.height, expectedHeight, `[ZOOM+ABS dim iter ${i}] height: state.height(${stateHeight}) * vp.scaleY(${vpScaleY})`);
    }

    dataManager.getObject = originalGetObject;
}

/**
 * **Validates: Requirements 3.2**
 * Test FIXED+ABSOLUTE+scaleWithWindowSize dimensions: width = state.width * uiScale
 * uiScale = min(root.width/1920, root.height/1080)
 */
function testFixedAbsoluteScaleWithWindowSize() {
    const uiScale = getUIScale();

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const stateWidth = randomFloat(10, 500);
        const stateHeight = randomFloat(10, 500);
        const parentId = 1;

        const parentBounds = { x: 0, y: 0, width: 1920, height: 1080 };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const node = createNode({
            x: randomFloat(0, 1000),
            y: randomFloat(0, 1000),
            width: stateWidth,
            height: stateHeight,
            positionBehaviour: 'FIXED',
            positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'FIXED',
            dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: true,
            parentId,
            viewportId: null
        });

        const result = computeBounds(node, renderNodes);

        const expectedWidth = stateWidth * uiScale;
        const expectedHeight = stateHeight * uiScale;

        assertApprox(result.width, expectedWidth, `[FIXED+ABS+scale dim iter ${i}] width: state.width(${stateWidth}) * uiScale(${uiScale})`);
        assertApprox(result.height, expectedHeight, `[FIXED+ABS+scale dim iter ${i}] height: state.height(${stateHeight}) * uiScale(${uiScale})`);
    }
}

/**
 * **Validates: Requirements 3.4**
 * Test that all three layout presets (WORLD, SCREEN, SCREEN_RELATIVE) are handled correctly
 * by verifying the combined position+dimension computation for each preset.
 */
function testAllLayoutPresetsCombined() {
    const originalGetObject = dataManager.getObject.bind(dataManager);

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const parentId = 1;
        const viewportId = 999;
        const parentBounds = { x: randomFloat(0, 200), y: randomFloat(0, 200), width: randomFloat(400, 1920), height: randomFloat(300, 1080) };
        const renderNodes = createRenderNodesWithParent(parentId, parentBounds);

        const vpX = randomFloat(-2000, 2000);
        const vpY = randomFloat(-2000, 2000);
        const vpScaleX = randomFloat(0.2, 4);
        const vpScaleY = randomFloat(0.2, 4);

        dataManager.getObject = (id) => {
            if (id === viewportId) {
                return { state: { x: vpX, y: vpY, scaleX: vpScaleX, scaleY: vpScaleY } };
            }
            return originalGetObject(id);
        };

        // WORLD preset: ZOOM position + ZOOM dimensions
        const worldX = randomFloat(-5000, 5000);
        const worldY = randomFloat(-5000, 5000);
        const worldW = randomFloat(10, 500);
        const worldH = randomFloat(10, 500);

        const worldNode = createNode({
            x: worldX, y: worldY, width: worldW, height: worldH,
            positionBehaviour: 'ZOOM', positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'ZOOM', dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: false,
            parentId, viewportId
        });

        const worldResult = computeBounds(worldNode, renderNodes);
        assertApprox(worldResult.x, (worldX - vpX) * vpScaleX, `[WORLD iter ${i}] x`);
        assertApprox(worldResult.y, (worldY - vpY) * vpScaleY, `[WORLD iter ${i}] y`);
        assertApprox(worldResult.width, worldW * vpScaleX, `[WORLD iter ${i}] width`);
        assertApprox(worldResult.height, worldH * vpScaleY, `[WORLD iter ${i}] height`);

        // SCREEN preset: FIXED position + FIXED dimensions + scaleWithWindowSize
        const screenX = randomFloat(0, 1000);
        const screenY = randomFloat(0, 1000);
        const screenW = randomFloat(10, 300);
        const screenH = randomFloat(10, 300);
        const uiScale = getUIScale();

        const screenNode = createNode({
            x: screenX, y: screenY, width: screenW, height: screenH,
            positionBehaviour: 'FIXED', positionType: 'ABSOLUTE',
            dimensionsBehaviour: 'FIXED', dimensionsType: 'ABSOLUTE',
            scaleWithWindowSize: true,
            parentId, viewportId: null
        });

        const screenResult = computeBounds(screenNode, renderNodes);
        assertApprox(screenResult.x, screenX, `[SCREEN iter ${i}] x`);
        assertApprox(screenResult.y, screenY, `[SCREEN iter ${i}] y`);
        assertApprox(screenResult.width, screenW * uiScale, `[SCREEN iter ${i}] width`);
        assertApprox(screenResult.height, screenH * uiScale, `[SCREEN iter ${i}] height`);

        // SCREEN_RELATIVE preset: FIXED + RELATIVE position + RELATIVE dimensions
        const relX = randomFloat(0, 1);
        const relY = randomFloat(0, 1);
        const relW = randomFloat(0, 1);
        const relH = randomFloat(0, 1);

        const relNode = createNode({
            x: relX, y: relY, width: relW, height: relH,
            positionBehaviour: 'FIXED', positionType: 'RELATIVE',
            dimensionsBehaviour: 'FIXED', dimensionsType: 'RELATIVE',
            scaleWithWindowSize: false,
            parentId, viewportId: null
        });

        const relResult = computeBounds(relNode, renderNodes);
        assertApprox(relResult.x, relX * parentBounds.width, `[SCREEN_RELATIVE iter ${i}] x`);
        assertApprox(relResult.y, relY * parentBounds.height, `[SCREEN_RELATIVE iter ${i}] y`);
        assertApprox(relResult.width, relW * parentBounds.width, `[SCREEN_RELATIVE iter ${i}] width`);
        assertApprox(relResult.height, relH * parentBounds.height, `[SCREEN_RELATIVE iter ${i}] height`);
    }

    dataManager.getObject = originalGetObject;
}

// --- Run all tests ---
console.log('=== Property Test: Layout computation correctness ===');
console.log(`Running ${NUM_ITERATIONS} iterations per property...\n`);

testRelativePosition();
console.log('  RELATIVE position: done');

testZoomAbsolutePosition();
console.log('  ZOOM+ABSOLUTE position: done');

testFixedAbsolutePosition();
console.log('  FIXED+ABSOLUTE position: done');

testRelativeDimensions();
console.log('  RELATIVE dimensions: done');

testZoomAbsoluteDimensions();
console.log('  ZOOM+ABSOLUTE dimensions: done');

testFixedAbsoluteScaleWithWindowSize();
console.log('  FIXED+ABSOLUTE+scaleWithWindowSize dimensions: done');

testAllLayoutPresetsCombined();
console.log('  All layout presets combined: done');

// --- Report results ---
console.log(`\n=== Results ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failures.length > 0) {
    console.log(`\nFailures:`);
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}

// Export results for the HTML page
export const results = { passed, failed, failures };
