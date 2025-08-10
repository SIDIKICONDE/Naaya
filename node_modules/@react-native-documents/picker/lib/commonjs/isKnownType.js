"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isKnownType = isKnownType;
var _NativeDocumentPicker = require("./spec/NativeDocumentPicker");
/**
 * The result of calling {@link isKnownType}
 * */

/**
 *
 * Checks if the given value (which can be a file extension, UTType identifier or mime) is known to the system.
 * Also returns the mime type which you can use to filter files on Android.
 *
 * @group DocumentPicker
 * */
function isKnownType(options) {
  const {
    kind,
    value
  } = options;
  const result = _NativeDocumentPicker.NativeDocumentPicker.isKnownType(kind, value);
  return result;
}
//# sourceMappingURL=isKnownType.js.map