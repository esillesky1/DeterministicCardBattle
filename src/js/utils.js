Math.seedrandom = function(seed) {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    let state = seed ? seed : Math.floor(Math.random() * (m - 1));
    Math.random = function() {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
};

