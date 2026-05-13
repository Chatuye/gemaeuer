/**
 * General-purpose utility functions.
 */


/** Returns a random hex colour code (e.g. "#a3f2b1"). */
export function randomHexColorCode() {
    let n = (Math.random() * 0xfffff * 1000000).toString(16);
    return '#' + n.slice(0, 6);
}
