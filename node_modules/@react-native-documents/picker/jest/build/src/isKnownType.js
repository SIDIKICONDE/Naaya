"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isKnownType = isKnownType;
const NativeDocumentPicker_1 = require("./spec/NativeDocumentPicker");
/**
 *
 * Checks if the given value (which can be a file extension, UTType identifier or mime) is known to the system.
 * Also returns the mime type which you can use to filter files on Android.
 *
 * @group DocumentPicker
 * */
function isKnownType(options) {
    const { kind, value } = options;
    const result = NativeDocumentPicker_1.NativeDocumentPicker.isKnownType(kind, value);
    return result;
}
