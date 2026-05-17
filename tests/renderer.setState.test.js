/**
 * Property Test: setState dirty-flag management
 * Feature: renderer-transitions, Property 13: Simplified setState — dirty flag only
 * Validates: Requirements 8.5
 *
 * Property statement:
 * For any registered object and any state field:
 * (a) calling setState with a new value SHALL set node.dirty = true and update the state field
 * (b) calling setState with the current value SHALL NOT modify the render node
 * (c) calling setState on an unregistered objectId SHALL not throw an error and have no effect
 */

import { renderer } from '../rendering/Renderer.js';

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

function assertEqual(actual, expected, message) {
    const eq = actual === expected;
    if (eq) {
        passed++;
    } else {
        failed++;
        failures.push(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
    }
}

// --- Random generators ---
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Renderable fields and their value generators
const RENDERABLE_FIELDS = {
    x: () => randomFloat(-1000, 1000),
    y: () => randomFloat(-1000, 1000),
    width: () => randomFloat(1, 2000),
    height: () => randomFloat(1, 2000),
    zIndex: () => randomInt(0, 10000),
    rotation: () => randomFloat(0, Math.PI * 2),
    transformOrigin: () => `${randomInt(0, 100)}% ${randomInt(0, 100)}%`,
    filter: () => `drop-shadow(${randomInt(0, 10)}px ${randomInt(0, 10)}px ${randomInt(0, 5)}px rgba(0,0,0,0.${randomInt(1, 9)}))`,
    facing: () => randomChoice(['FRONT', 'BACK'])
};

const FIELD_NAMES = Object.keys(RENDERABLE_FIELDS);

// --- Helper: create a mock state object ---
function createMockState(objectId) {
    return {
        objectId,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 1,
        rotation: 0,
        transformOrigin: '50% 50%',
        filter: 'none',
        facing: 'FRONT',
        positionBehaviour: 'FIXED',
        positionType: 'ABSOLUTE',
        dimensionsBehaviour: 'FIXED',
        dimensionsType: 'ABSOLUTE',
        scaleWithWindowSize: false
    };
}

// --- Helper: create a mock div ---
function createMockDiv() {
    const div = document.createElement('div');
    return div;
}

// --- Helper: clean up renderer renderNodes between tests ---
function cleanup() {
    for (const [id] of renderer.renderNodes) {
        renderer.unregister(id);
    }
}

// --- Property Tests ---

const NUM_ITERATIONS = 100;

/**
 * **Validates: Requirements 8.5**
 * Property 13a: setState with a new value sets node.dirty = true and updates the state field
 */
function testProperty13a_newValueMarksDirty() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        cleanup();

        const objectId = randomInt(1, 99999);
        const state = createMockState(objectId);
        const div = createMockDiv();

        renderer.register(objectId, { state, div, parentId: null, viewportId: null });

        // Pick a random field
        const field = randomChoice(FIELD_NAMES);
        const currentValue = state[field];

        // Generate a new value that is different from the current
        let newValue = RENDERABLE_FIELDS[field]();
        let attempts = 0;
        while (newValue === currentValue && attempts < 20) {
            newValue = RENDERABLE_FIELDS[field]();
            attempts++;
        }

        // Skip if we couldn't generate a different value (extremely unlikely)
        if (newValue === currentValue) continue;

        const node = renderer.renderNodes.get(objectId);

        // Pre-conditions: clear dirty from registration so we test setState in isolation
        node.dirty = false;
        assertEqual(node.dirty, false, `[13a iter ${i}] render node should start clean`);

        // Act
        renderer.setState(objectId, field, newValue);

        // Post-conditions
        assertEqual(node.dirty, true, `[13a iter ${i}] node.dirty should be true after setState('${field}', ${JSON.stringify(newValue)})`);
        assertEqual(node.state[field], newValue, `[13a iter ${i}] state.${field} should be updated to new value`);

        // Verify no changedFields property exists on render node (removed by design)
        assertEqual(node.changedFields, undefined, `[13a iter ${i}] render node should not have changedFields property`);
    }
}

/**
 * **Validates: Requirements 8.5**
 * Property 13b: setState with the current value does NOT modify the render node
 */
function testProperty13b_sameValueNoOp() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        cleanup();

        const objectId = randomInt(1, 99999);
        const state = createMockState(objectId);
        const div = createMockDiv();

        // Randomize the initial state
        const field = randomChoice(FIELD_NAMES);
        state[field] = RENDERABLE_FIELDS[field]();

        renderer.register(objectId, { state, div, parentId: null, viewportId: null });

        const node = renderer.renderNodes.get(objectId);
        const currentValue = state[field];

        // Pre-conditions: clear dirty from registration so we test setState in isolation
        node.dirty = false;
        assertEqual(node.dirty, false, `[13b iter ${i}] render node should start clean`);

        // Act: set to the same value
        renderer.setState(objectId, field, currentValue);

        // Post-conditions
        assertEqual(node.dirty, false, `[13b iter ${i}] node.dirty should remain false when setting same value for '${field}'`);
        assertEqual(node.state[field], currentValue, `[13b iter ${i}] state.${field} should be unchanged`);
    }
}

/**
 * **Validates: Requirements 8.5**
 * Property 13c: Multiple setState calls within one frame all set dirty, state reflects last write
 */
function testProperty13c_multipleFieldsDirtyOnce() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        cleanup();

        const objectId = randomInt(1, 99999);
        const state = createMockState(objectId);
        const div = createMockDiv();

        renderer.register(objectId, { state, div, parentId: null, viewportId: null });

        const node = renderer.renderNodes.get(objectId);

        // Clear dirty from registration so we test setState in isolation
        node.dirty = false;

        // Pick a random subset of fields (at least 2)
        const numFields = randomInt(2, FIELD_NAMES.length);
        const shuffled = [...FIELD_NAMES].sort(() => Math.random() - 0.5);
        const fieldsToChange = shuffled.slice(0, numFields);

        const newValues = {};
        for (const field of fieldsToChange) {
            let newValue = RENDERABLE_FIELDS[field]();
            // Ensure it's different from current
            let attempts = 0;
            while (newValue === state[field] && attempts < 20) {
                newValue = RENDERABLE_FIELDS[field]();
                attempts++;
            }
            newValues[field] = newValue;
        }

        // Act: set multiple fields
        for (const field of fieldsToChange) {
            if (newValues[field] !== state[field]) {
                renderer.setState(objectId, field, newValues[field]);
            }
        }

        // Post-conditions: dirty is true, all state fields updated
        assertEqual(node.dirty, true, `[13c iter ${i}] node.dirty should be true after multiple setState calls`);

        for (const field of fieldsToChange) {
            if (newValues[field] !== undefined) {
                assertEqual(node.state[field], newValues[field], `[13c iter ${i}] state.${field} should reflect the new value`);
            }
        }
    }
}

/**
 * Property 13 additional: unregistered objectId → no error, no effect
 */
function testUnregisteredObjectId_noError() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        cleanup();

        const unregisteredId = randomInt(100000, 999999);
        const field = randomChoice(FIELD_NAMES);
        const value = RENDERABLE_FIELDS[field]();

        // Act: should not throw
        let threw = false;
        try {
            renderer.setState(unregisteredId, field, value);
        } catch (e) {
            threw = true;
        }

        assert(!threw, `[unregistered iter ${i}] setState on unregistered id ${unregisteredId} should not throw`);

        // Verify no render node was created
        assertEqual(renderer.renderNodes.has(unregisteredId), false, `[unregistered iter ${i}] no render node should be created for unregistered id`);
    }
}

// --- Run all tests ---
console.log('=== Property Test: setState dirty-flag management (Property 13) ===');
console.log(`Running ${NUM_ITERATIONS} iterations per property...\n`);

testProperty13a_newValueMarksDirty();
console.log(`  13a (new value marks dirty): done`);

testProperty13b_sameValueNoOp();
console.log(`  13b (same value no-op): done`);

testProperty13c_multipleFieldsDirtyOnce();
console.log(`  13c (multiple fields, dirty once): done`);

testUnregisteredObjectId_noError();
console.log(`  unregistered objectId: done`);

// Cleanup
cleanup();

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
