"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickDirectory = pickDirectory;
const react_native_1 = require("react-native");
const NativeDocumentPicker_1 = require("./spec/NativeDocumentPicker");
/**
 * Opens a directory picker.
 *
 * @group DocumentPicker
 * */
async function pickDirectory(options) {
    const optionsOverride = (() => {
        if (react_native_1.Platform.OS === 'ios') {
            return {
                ...options,
                mode: 'open',
                allowMultiSelection: false,
                type: ['public.folder'],
            };
        }
        else {
            return {
                // technically, "mode" is ignored here, and we shouldn't need to specify anything but the PickOptions data class
                // requires mode to be set
                mode: 'open',
                ...options,
            };
        }
    })();
    return NativeDocumentPicker_1.NativeDocumentPicker.pickDirectory(optionsOverride);
}
