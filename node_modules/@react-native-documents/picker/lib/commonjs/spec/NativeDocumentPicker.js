"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NativeDocumentPicker = void 0;
var _reactNative = require("react-native");
/**
 * Indicates, for each Uri that was passed to {@link keepLocalCopy}, whether the local copy was successfully created or not.
 *
 * If the copy was successful, the status field is `success` and `localUri` contains the local Uri.
 * If the copy was not successful, the status field is `error` and `copyError` field contains the error message.
 * */

const NativeDocumentPicker = exports.NativeDocumentPicker = _reactNative.TurboModuleRegistry.getEnforcing('RNDocumentPicker');
//# sourceMappingURL=NativeDocumentPicker.js.map