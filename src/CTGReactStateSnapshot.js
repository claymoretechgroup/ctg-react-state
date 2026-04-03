import CTGReactStateError from "./CTGReactStateError.js"; // Typed errors

// Snapshot storage and time-travel for CTGReactState
export default class CTGReactStateSnapshot {

    // CONSTRUCTOR :: ctgReactState, OBJECT? -> this
    // opts: { storage?, maxHistory?, auto? }
    constructor(stateInstance, opts = {}) {
        this._state = stateInstance;
        this._snapshots = {};
        this._order = [];
        this._cursor = -1;
        this._storage = opts.storage || null;
        this._maxHistory = opts.maxHistory || null;
        this._auto = opts.auto || false;
        this._autoIndex = 0;

        this._restoring = false;

        if (this._auto) {
            this._state.use(async (id, val, prev) => {
                if (!this._restoring) await this.save();
                return val;
            });
        }
    }

    /**
     *
     * Instance Methods
     *
     */

    // :: STRING? -> PROMISE(this)
    // Saves current state. Key defaults to auto-incrementing index.
    async save(key) {
        const snapKey = key !== undefined && key !== null ? key : String(this._autoIndex++);
        const data = this._state.export();

        if (this._storage) {
            await this._storage.save(snapKey, data);
        } else {
            this._snapshots[snapKey] = data;
        }

        if (!this._order.includes(snapKey)) {
            this._order.push(snapKey);
        }
        this._cursor = this._order.length - 1;

        // Trim to maxHistory
        if (this._maxHistory && this._order.length > this._maxHistory) {
            const removed = this._order.shift();
            if (this._storage) {
                await this._storage.remove(removed);
            } else {
                delete this._snapshots[removed];
            }
            this._cursor = this._order.length - 1;
        }

        return this;
    }

    // :: STRING -> PROMISE(this)
    // Restores a previously saved snapshot.
    async restore(key) {
        let data;
        if (this._storage) {
            data = await this._storage.load(key);
        } else {
            data = this._snapshots[key];
        }

        if (!data) {
            throw new CTGReactStateError("SNAPSHOT_NOT_FOUND", `Snapshot not found: ${key}`);
        }

        this._restoring = true;
        try {
            await this._state.import(data);
        } finally {
            this._restoring = false;
        }
        const idx = this._order.indexOf(key);
        if (idx !== -1) this._cursor = idx;
        return this;
    }

    // :: VOID -> PROMISE([STRING])
    // Returns snapshot keys in insertion order.
    async list() {
        if (this._storage) {
            return await this._storage.list();
        }
        return [...this._order];
    }

    // :: VOID -> PROMISE(this)
    // Moves cursor back and restores. No-op at beginning.
    async back() {
        if (this._cursor <= 0) return this;
        this._cursor--;
        const key = this._order[this._cursor];
        await this.restore(key);
        return this;
    }

    // :: VOID -> PROMISE(this)
    // Moves cursor forward and restores. No-op at end.
    async forward() {
        if (this._cursor >= this._order.length - 1) return this;
        this._cursor++;
        const key = this._order[this._cursor];
        await this.restore(key);
        return this;
    }

    // :: VOID -> STRING|NULL
    // Returns key at current cursor position.
    current() {
        if (this._cursor < 0 || this._cursor >= this._order.length) return null;
        return this._order[this._cursor];
    }

    // :: VOID -> PROMISE(this)
    // Removes all snapshots and resets cursor.
    async clear() {
        if (this._storage) {
            // Query backend for all keys, not just _order, to catch pre-existing/persisted keys
            const allKeys = await this._storage.list();
            for (const key of allKeys) {
                await this._storage.remove(key);
            }
        }
        this._snapshots = {};
        this._order = [];
        this._cursor = -1;
        return this;
    }
}
