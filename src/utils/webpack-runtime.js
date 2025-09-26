/**
 * Webpack Runtime - Module loader and bundler utilities
 */

// Webpack module cache
const installedModules = {};

// The require function
function __webpack_require__(moduleId) {
    // Check if module is in cache
    if (installedModules[moduleId]) {
        return installedModules[moduleId].exports;
    }
    
    // Create a new module (and put it into the cache)
    const module = installedModules[moduleId] = {
        i: moduleId,
        l: false,
        exports: {}
    };
    
    // Execute the module function
    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
    
    // Flag the module as loaded
    module.l = true;
    
    // Return the exports of the module
    return module.exports;
}

// Expose the modules object (__webpack_modules__)
__webpack_require__.m = modules;

// Expose the module cache
__webpack_require__.c = installedModules;

// Define getter function for harmony exports
__webpack_require__.d = function(exports, name, getter) {
    if (!__webpack_require__.o(exports, name)) {
        Object.defineProperty(exports, name, { enumerable: true, get: getter });
    }
};

// Define __esModule on exports
__webpack_require__.r = function(exports) {
    if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    }
    Object.defineProperty(exports, '__esModule', { value: true });
};

// Create a fake namespace object
__webpack_require__.t = function(value, mode) {
    if (mode & 1) value = __webpack_require__(value);
    if (mode & 8) return value;
    if ((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
    
    const ns = Object.create(null);
    __webpack_require__.r(ns);
    Object.defineProperty(ns, 'default', { enumerable: true, value: value });
    
    if (mode & 2 && typeof value != 'string') {
        for (const key in value) {
            __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
        }
    }
    return ns;
};

// Getownproperty function that is safe to call
__webpack_require__.n = function(module) {
    const getter = module && module.__esModule 
        ? function getDefault() { return module['default']; }
        : function getModuleExports() { return module; };
    
    __webpack_require__.d(getter, 'a', getter);
    return getter;
};

// Object.prototype.hasOwnProperty.call
__webpack_require__.o = function(object, property) { 
    return Object.prototype.hasOwnProperty.call(object, property); 
};

// __webpack_public_path__
__webpack_require__.p = "";

export default __webpack_require__;