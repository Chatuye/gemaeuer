/**
 * Property Test: setState dirty-flag management
 * Validates: Requirements 2.1, 2.2, 2.3
 *
 * Property statement:
 * For any registered object and any renderable field:
 * (a) calling setState with a new value SHALL mark the object dirty and add the field to changedFields
 * (b) calling setState with the current value SHALL NOT mark it dirty
 * (c) calling setState multiple times within one frame SHALL result in exactly one processing pass
 *     with all changed fields collected
 *
 * Also tests: unregistered objectId → no error thrown, no effect
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

function randomString(len) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
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

// --- Helper: clean up renderer entries between tests ---
function cleanup() {
    for (const [id] of renderer.entries) {
        renderer.unregister(id);
    }
}

// --- Property Tests ---

const NUM_ITERATIONS = 100;

/**
 * **Validates: Requirements 2.1**
 * Property 3a: setState with a new value marks the object dirty and adds field to changedFields
 */
function testProperty3a_newValueMarksDirty() {
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

        const entry = renderer.entries.get(objectId);

        // Pre-conditions: clear dirty from registration so we test setState in isolation
        entry.dirty = false;
        entry.changedFields.clear();
        assertEqual(entry.dirty, false, `[3a iter ${i}] entry should start clean`);
        assertEqual(entry.changedFields.size, 0, `[3a iter ${i}] changedFields should start empty`);

        // Act
        renderer.setState(objectId, field, newValue);

        // Post-conditions
        assertEqual(entry.dirty, true, `[3a iter ${i}] entry.dirty should be true after setState('${field}', ${JSON.stringify(newValue)})`);
        assert(entry.changedFields.has(field), `[3a iter ${i}] changedFields should contain '${field}'`);
        assertEqual(entry.state[field], newValue, `[3a iter ${i}] state.${field} should be updated to new value`);
    }
}

/**
 * **Validates: Requirements 2.2**
 * Property 3b: setState with the current value does NOT mark dirty
 */
function testProperty3b_sameValueNoOp() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        cleanup();

        const objectId = randomInt(1, 99999);
        const state = createMockState(objectId);
        const div = createMockDiv();

        // Randomize the initial state
        const field = randomChoice(FIELD_NAMES);
        state[field] = RENDERABLE_FIELDS[field]();

        renderer.register(objectId, { state, div, parentId: null, viewportId: null });

        const entry = renderer.entries.get(objectId);
        const currentValue = state[field];

        // Pre-conditions: clear dirty from registration so we test setState in isolation
        entry.dirty = false;
        entry.changedFields.clear();
        assertEqual(entry.dirty, false, `[3b iter ${i}] entry should start clean`);

        // Act: set to the same value
        renderer.setState(objectId, field, currentValue);

        // Post-conditions
        assertEqual(entry.dirty, false, `[3b iter ${i}] entry.dirty should remain false when setting same value for '${field}'`);
        assertEqual(entry.changedFields.size, 0, `[3b iter ${i}] changedFields should remain empty`);
        assertEqual(entry.state[field], currentValue, `[3b iter ${i}] state.${field} should be unchanged`);
    }
}

/**
 * **Validates: Requirements 2.3**
 * Property 3c: Multiple setState calls within one frame collect all changed fields, dirty once
 */
function testProperty3c_multipleFieldsCollected() {
    for (let i = 0; i < NUM_ITERATIONS; i++) {
        cleanup();

        const objectId = randomInt(1, 99999);
        const state = createMockState(objectId);
        const div = createMockDiv();

        renderer.register(objectId, { state, div, parentId: null, viewportId: null });

        const entry = renderer.entries.get(objectId);

        // Clear dirty from registration so we test setState in isolation
        entry.dirty = false;
        entry.changedFields.clear();

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

        // Post-conditions: dirty once, all fields collected
        assertEqual(entry.dirty, true, `[3c iter ${i}] entry.dirty should be true after multiple setState calls`);

        for (const field of fieldsToChange) {
            if (newValues[field] !== state[field]) {
                // The value was already written by setState above, so check changedFields
                assert(entry.changedFields.has(field), `[3c iter ${i}] changedFields should contain '${field}'`);
            }
        }

        // Verify all changed fields are in the set (no duplicates, just presence)
        for (const field of entry.changedFields) {
            assert(fieldsToChange.includes(field), `[3c iter ${i}] changedFields should only contain fields we changed, found '${field}'`);
        }
    }
}

/**
 * Property 3 additional: unregistered objectId → no error, no effect
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

        // Verify no entry was created
        assertEqual(renderer.entries.has(unregisteredId), false, `[unregistered iter ${i}] no entry should be created for unregistered id`);
    }
}

// --- Run all tests ---
console.log('=== Property Test: setState dirty-flag management ===');
console.log(`Running ${NUM_ITERATIONS} iterations per property...\n`);

testProperty3a_newValueMarksDirty();
console.log(`  3a (new value marks dirty): done`);

testProperty3b_sameValueNoOp();
console.log(`  3b (same value no-op): done`);

testProperty3c_multipleFieldsCollected();
console.log(`  3c (multiple fields collected): done`);

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
