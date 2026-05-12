/**
 * LayoutPresets — predefined configurations for how objects are positioned and sized.
 *
 * Every object on a stage has two questions to answer:
 *   1. WHERE is it? (position)
 *   2. HOW BIG is it? (dimensions)
 *
 * Each answer has two parts:
 *   - Behaviour: does it move/scale with the viewport (ZOOM), or stay fixed on screen (FIXED)?
 *   - Type: are the values in world units (ABSOLUTE) or fractions of the parent (RELATIVE)?
 *
 * On top of that, there's one extra flag:
 *   - uiScaling: if true, dimensions are multiplied by (main stage size / 1920x1080).
 *     This keeps objects the same relative size on any screen resolution.
 *     A card that looks right on a 1920x1080 monitor will look proportionally
 *     the same on a 2560x1440 or 1366x768 monitor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The presets are named by WHERE the object lives:
 *
 *   WORLD    — the object lives in the game world.
 *              It pans and zooms with the viewport.
 *
 *   SCREEN   — the object lives on the screen.
 *              It stays put regardless of zoom/pan.
 *
 * Suffixes describe special behaviour:
 *
 *   _RELATIVE  — dimensions are fractions of the parent (0–1) instead of
 *                fixed values. Useful for containers that should fill or
 *                partially fill their parent.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Which objects use which preset:
 *
 *   WORLD           — tiles, nested game stages, cards dropped on the table
 *   SCREEN          — the deck, cards in hand or being dragged
 *   SCREEN_RELATIVE — the main game stage (fills the window with width:1, height:1)
 */
const LayoutPresets = {

    /** Lives in the world. Pans and zooms with the viewport. Size is in world units. */
    WORLD: {
        positionBehaviour: "ZOOM",
        positionType: "ABSOLUTE",
        dimensionsBehaviour: "ZOOM",
        dimensionsType: "ABSOLUTE",
        uiScaling: false
    },

    /** Lives on the screen. Ignores zoom/pan. Size adapts to screen resolution. */
    SCREEN: {
        positionBehaviour: "FIXED",
        positionType: "ABSOLUTE",
        dimensionsBehaviour: "FIXED",
        dimensionsType: "ABSOLUTE",
        uiScaling: true
    },

    /** Lives on the screen. Ignores zoom/pan. Size is a fraction of the parent (0–1). */
    SCREEN_RELATIVE: {
        positionBehaviour: "FIXED",
        positionType: "ABSOLUTE",
        dimensionsBehaviour: "FIXED",
        dimensionsType: "RELATIVE",
        uiScaling: false
    }
};
