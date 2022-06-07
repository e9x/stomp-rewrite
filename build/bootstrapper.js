/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["StompBootstrapper"] = factory();
	else
		root["StompBootstrapper"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 251:
/***/ (function(__unused_webpack_module, exports) {

eval("\nvar __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {\n    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }\n    return new (P || (P = Promise))(function (resolve, reject) {\n        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }\n        function rejected(value) { try { step(generator[\"throw\"](value)); } catch (e) { reject(e); } }\n        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }\n        step((generator = generator.apply(thisArg, _arguments || [])).next());\n    });\n};\nvar __generator = (this && this.__generator) || function (thisArg, body) {\n    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;\n    return g = { next: verb(0), \"throw\": verb(1), \"return\": verb(2) }, typeof Symbol === \"function\" && (g[Symbol.iterator] = function() { return this; }), g;\n    function verb(n) { return function (v) { return step([n, v]); }; }\n    function step(op) {\n        if (f) throw new TypeError(\"Generator is already executing.\");\n        while (_) try {\n            if (f = 1, y && (t = op[0] & 2 ? y[\"return\"] : op[0] ? y[\"throw\"] || ((t = y[\"return\"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;\n            if (y = 0, t) op = [op[0] & 2, t.value];\n            switch (op[0]) {\n                case 0: case 1: t = op; break;\n                case 4: _.label++; return { value: op[1], done: false };\n                case 5: _.label++; y = op[1]; op = [0]; continue;\n                case 7: op = _.ops.pop(); _.trys.pop(); continue;\n                default:\n                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }\n                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }\n                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }\n                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }\n                    if (t[2]) _.ops.pop();\n                    _.trys.pop(); continue;\n            }\n            op = body.call(thisArg, _);\n        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }\n        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };\n    }\n};\nObject.defineProperty(exports, \"__esModule\", ({ value: true }));\nvar Bootstrapper = /** @class */ (function () {\n    function Bootstrapper(config) {\n        this.config = config;\n    }\n    Bootstrapper.prototype.register = function () {\n        return __awaiter(this, void 0, void 0, function () {\n            return __generator(this, function (_a) {\n                switch (_a.label) {\n                    case 0:\n                        if (!('serviceWorker' in navigator))\n                            throw new Error('Your browser does not support service workers.');\n                        return [4 /*yield*/, navigator.serviceWorker.register(new URL('worker.js?config=' + encodeURIComponent(JSON.stringify(this.config)), this.config.scripts), {\n                                scope: this.config.scope,\n                                updateViaCache: 'none',\n                            })];\n                    case 1:\n                        _a.sent();\n                        return [2 /*return*/];\n                }\n            });\n        });\n    };\n    return Bootstrapper;\n}());\nexports[\"default\"] = Bootstrapper;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMjUxLmpzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUE7SUFFQyxzQkFBWSxNQUEyQjtRQUN0QyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBQ0ssK0JBQVEsR0FBZDs7Ozs7d0JBQ0MsSUFBSSxDQUFDLENBQUMsZUFBZSxJQUFJLFNBQVMsQ0FBQzs0QkFDbEMsTUFBTSxJQUFJLEtBQUssQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO3dCQUVuRSxxQkFBTSxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FDckMsSUFBSSxHQUFHLENBQ04sbUJBQW1CLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDckUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ25CLEVBQ0Q7Z0NBQ0MsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSztnQ0FDeEIsY0FBYyxFQUFFLE1BQU07NkJBQ3RCLENBQ0Q7O3dCQVRELFNBU0MsQ0FBQzs7Ozs7S0FDRjtJQUNGLG1CQUFDO0FBQUQsQ0FBQyIsInNvdXJjZXMiOlsid2VicGFjazovL1N0b21wQm9vdHN0cmFwcGVyLy4vc3JjL2Jvb3RzdHJhcHBlci50cz9lYTAzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNlcnZpY2VXb3JrZXJDb25maWcgfSBmcm9tICcuL3NlcnZpY2VXb3JrZXInO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBCb290c3RyYXBwZXIge1xuXHRjb25maWc6IFNlcnZpY2VXb3JrZXJDb25maWc7XG5cdGNvbnN0cnVjdG9yKGNvbmZpZzogU2VydmljZVdvcmtlckNvbmZpZykge1xuXHRcdHRoaXMuY29uZmlnID0gY29uZmlnO1xuXHR9XG5cdGFzeW5jIHJlZ2lzdGVyKCkge1xuXHRcdGlmICghKCdzZXJ2aWNlV29ya2VyJyBpbiBuYXZpZ2F0b3IpKVxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdZb3VyIGJyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBzZXJ2aWNlIHdvcmtlcnMuJyk7XG5cblx0XHRhd2FpdCBuYXZpZ2F0b3Iuc2VydmljZVdvcmtlci5yZWdpc3Rlcihcblx0XHRcdG5ldyBVUkwoXG5cdFx0XHRcdCd3b3JrZXIuanM/Y29uZmlnPScgKyBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkodGhpcy5jb25maWcpKSxcblx0XHRcdFx0dGhpcy5jb25maWcuc2NyaXB0c1xuXHRcdFx0KSxcblx0XHRcdHtcblx0XHRcdFx0c2NvcGU6IHRoaXMuY29uZmlnLnNjb3BlLFxuXHRcdFx0XHR1cGRhdGVWaWFDYWNoZTogJ25vbmUnLFxuXHRcdFx0fVxuXHRcdCk7XG5cdH1cbn1cbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///251\n");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__[251](0, __webpack_exports__);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});