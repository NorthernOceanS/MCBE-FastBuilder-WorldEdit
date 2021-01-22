/*
** This file may be separated as a npm package in future,
** but currently it isn't.
*/

export const emptyPlatform = {
    use() { /* no-op */ }
}

export class System {
    constructor() {
        this._platform = null;
        this._generators = [];
    }
    /*
    ** Following functions are used by platform.
    ** If you are a generator developer,
    ** please don't rely on these functions.
    */
    inject(platform) {
        this._platform = platform;
    }
    /*
    ** Following functions are used by users,
    ** If you are a generator developer,
    ** please don't rely on these functions.
    */
    addUser(user) {
        // no-op
    }
    removeUser(user) {
        // no-op
    }
    getGenerators() {
        return Array.from(this._generators);
    }
    /*
    ** Following functions are register API of system.
    */
    registerGenerator(generator) {
        this._generators.push(generator);
    }
}

export class UserSystem {
    constructor(system) {
        this._system = system;
        this._system.addUser(this);
        this._generators = system.getGenerators();
        this._generatorStates = Array(this._generators.length);
        for(let i = 0; i < this._generatorStates.length; ++i) {
            this._generatorStates[i] = {};
        }
    }
    function exit() {
        this._system.removeUser(this);
    }
}