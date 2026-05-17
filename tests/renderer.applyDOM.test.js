/**
 * Property Test: Unconditional property writes for dirty render nodes
 * Feature: renderer-transitions, Property 12: Unconditional property writes for dirty render nodes
 * Validates: Requirements 8.2
 *
 * Property statement:
 * For any dirty render node with no active transition on its main div, applyDOM SHALL write
 * all visual properties (zIndex, transform, transformOrigin, filter) to the element's
 * style, regardless of which state fields were modified.
 */

import { applyDOM } from '../rendering/Renderer.js';

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
        failures.push(`${message} â€” expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
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

// --- Test helpers ---

function createMockNode() {
    const div = document.createElement('div');
    const zIndex = randomInt(0, 10000);
    const rotation = randomFloat(0, Math.PI * 2);
    const transformOrigin = `${randomInt(0, 100)}% ${randomInt(0, 100)}%`;
    const filter = `brightness(${randomFloat(0.5, 2).toFixed(2)})`;

    const state = {
        zIndex,
        rotation,
        transformOrigin,
        filter
    };

    const bounds = {
        x: randomFloat(0, 1000),
        y: randomFloat(0, 1000),
        width: randomFloat(10, 500),
        height: randomFloat(10, 500)
    };

    return { div, state, bounds, dirty: true };
}

// --- Property Tests ---

const NUM_ITERATIONS = 100;

/**
 * Property 12: All visual properties are written unconditionally for dirty render nodes
 * with no active transition.
 */
function testProperty12_unconditionalWrites() {
    const emptyTransitions = new Map();

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const node = createMockNode();

        // Act: call applyDOM with empty transitions map (no guards)
        applyDOM(node, emptyTransitions);

        // Post-conditions: all visual properties should be written
        assertEqual(
            node.div.style.left,
            node.bounds.x + 'px',
            `[iter ${i}] left should be written`
        );
        assertEqual(
            node.div.style.top,
            node.bounds.y + 'px',
            `[iter ${i}] top should be written`
        );
        assertEqual(
            node.div.style.width,
            node.bounds.width + 'px',
            `[iter ${i}] width should be written`
        );
        assertEqual(
            node.div.style.height,
            node.bounds.height + 'px',
            `[iter ${i}] height should be written`
        );

        assertEqual(
            node.div.style.zIndex,
            String(node.state.zIndex),
            `[iter ${i}] zIndex should be written`
        );

        assertEqual(
            node.div.style.transformOrigin,
            node.state.transformOrigin,
            `[iter ${i}] transformOrigin should be written`
        );

        const expectedTransform = node.state.rotation
            ? `rotate(${node.state.rotation}rad)`
            : 'none';
        assertEqual(
            node.div.style.transform,
            expectedTransform,
            `[iter ${i}] transform should be written`
        );

        // -webkit-filter is set via setProperty
        const filterValue = node.div.style.getPropertyValue('-webkit-filter');
        assertEqual(
            filterValue,
            node.state.filter,
            `[iter ${i}] -webkit-filter should be written`
        );
    }
}

/**
 * Property 12 additional: When rotation is 0/falsy, transform should be 'none'
 */
function testProperty12_zeroRotationWritesNone() {
    const emptyTransitions = new Map();

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const node = createMockNode();
        node.state.rotation = 0;

        applyDOM(node, emptyTransitions);

        assertEqual(
            node.div.style.transform,
            'none',
            `[zero-rotation iter ${i}] transform should be 'none' when rotation is 0`
        );
    }
}

/**
 * Property 12 additional: When filter is falsy, -webkit-filter should be 'none'
 */
function testProperty12_noFilterWritesNone() {
    const emptyTransitions = new Map();

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const node = createMockNode();
        node.state.filter = randomChoice([null, undefined, '', 0]);

        applyDOM(node, emptyTransitions);

        const filterValue = node.div.style.getPropertyValue('-webkit-filter');
        assertEqual(
            filterValue,
            'none',
            `[no-filter iter ${i}] -webkit-filter should be 'none' when filter is falsy`
        );
    }
}

/**
 * Property 12 additional: Writes happen regardless of previous style values
 * (no changedFields gating â€” every dirty frame writes everything)
 */
function testProperty12_overwritesPreviousStyles() {
    const emptyTransitions = new Map();

    for (let i = 0; i < NUM_ITERATIONS; i++) {
        const node = createMockNode();

        // Pre-set some style values to simulate a previous frame
        node.div.style.zIndex = String(randomInt(0, 100));
        node.div.style.transform = 'rotate(999rad)';
        node.div.style.transformOrigin = '0% 0%';
        node.div.style.setProperty('-webkit-filter', 'blur(10px)');

        // Act
        applyDOM(node, emptyTransitions);

        // Post-conditions: all should be overwritten with current state
        assertEqual(
            node.div.style.zIndex,
            String(node.state.zIndex),
            `[overwrite iter ${i}] zIndex should be overwritten`
        );

        const expectedTransform = node.state.rotation
            ? `rotate(${node.state.rotation}rad)`
            : 'none';
        assertEqual(
            node.div.style.transform,
            expectedTransform,
            `[overwrite iter ${i}] transform should be overwritten`
        );

        assertEqual(
            node.div.style.transformOrigin,
            node.state.transformOrigin,
            `[overwrite iter ${i}] transformOrigin should be overwritten`
        );

        const filterValue = node.div.style.getPropertyValue('-webkit-filter');
        assertEqual(
            filterValue,
            node.state.filter,
            `[overwrite iter ${i}] -webkit-filter should be overwritten`
        );
    }
}

// --- Run all tests ---
console.log('=== Property Test: Unconditional applyDOM writes (Property 12) ===');
console.log(`Running ${NUM_ITERATIONS} iterations per property...\n`);

testProperty12_unconditionalWrites();
console.log('  12 (unconditional writes): done');

testProperty12_zeroRotationWritesNone();
console.log('  12 (zero rotation â†’ none): done');

testProperty12_noFilterWritesNone();
console.log('  12 (no filter â†’ none): done');

testProperty12_overwritesPreviousStyles();
console.log('  12 (overwrites previous styles): done');

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
