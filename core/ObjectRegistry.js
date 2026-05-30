/**
 * ObjectRegistry — maps type strings to constructors and instantiates objects.
 *
 * Uses the **self-registration pattern**: each class registers itself at module
 * evaluation time by calling `objectRegistry.register("TYPE", Class)`. The
 * registry never imports or references any class directly — it only stores
 * what is handed to it. This inverts the dependency: classes know about the
 * registry, but the registry knows nothing about classes.
 *
 * A barrel file (`registry.js`) imports all registrable classes so their
 * side-effect registrations run before any `create()` call.
 *
 * Singleton instance exported as `objectRegistry`.
 */
class ObjectRegistry {
    constructor() {
        /** Running counter used to assign unique object IDs. */
        this.numObjects = 0;
        /** Map<string, class> — type string → constructor. */
        this.registry = new Map();
    }

    /**
     * Register a constructor for a given type string.
     * Called once per class at module load time.
     *
     * @param {string} type — the objectType identifier (e.g. "CARD")
     * @param {Function} constructor — the class to instantiate for this type
     */
    register(type, constructor) {
        this.registry.set(type, constructor);
    }

    /**
     * Instantiate a live object from a StateObject.
     * Assigns an objectId if the state doesn't have one yet, then looks up
     * the constructor by `state.objectType` and calls `new`.
     *
     * @param {StateObject} state — serialisable state with an `objectType` field
     * @returns {object|null} the instantiated object, or null if the type is unknown
     */
    create(state) {
        if(state.objectId == -1) {
			state.objectId = this.numObjects;
            this.numObjects += 1;
		}

        const Constructor = this.registry.get(state.objectType);
        if(!Constructor) {
            console.log("ERROR: Unknown object type: "+state.objectType);
            return null;
        }
        return new Constructor(state);
    }
}

export const objectRegistry = new ObjectRegistry();
