"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pick = pick;
const NativeDocumentPicker_1 = require("./spec/NativeDocumentPicker");
const fileTypes_1 = require("./fileTypes");
const react_native_1 = require("react-native");
const validateTypes_1 = require("./validateTypes");
/**
 * The method for picking a file, both for `import` and `open` modes.
 *
 * For result types, see {@link DocumentPickerResponse} or {@link DocumentPickerResponseOpenLongTerm}.
 *
 * For options, see {@link DocumentPickerOptionsImport}, {@link DocumentPickerOptionsOpenOnce} or {@link DocumentPickerOptionsOpenLongTerm}.
 *
 * @group DocumentPicker
 * */
async function pick(options) {
    const type = (() => {
        if (!options?.type) {
            return [fileTypes_1.types.allFiles];
        }
        const newType = Array.isArray(options.type) ? options.type : [options.type];
        return newType.flat().map((it) => it.trim());
    })();
    const newOpts = {
        mode: 'import',
        // allowMultiSelection must be false to maintain old (v5) behavior
        allowMultiSelection: false,
        allowVirtualFiles: false,
        ...options,
        type,
    };
    if (!newOpts.type.every((it) => typeof it === 'string')) {
        throw new TypeError(`Unexpected type option in ${newOpts.type}, did you try using a DocumentPicker.types.* that does not exist?`);
    }
    if ('mode' in newOpts && !['import', 'open'].includes(newOpts.mode)) {
        throw new TypeError('Invalid mode option: ' + newOpts.mode);
    }
    const response = NativeDocumentPicker_1.NativeDocumentPicker.pick(newOpts);
    const awaitedResult = await response;
    for (const res of awaitedResult) {
        if (react_native_1.Platform.OS === 'android') {
            res.hasRequestedType = (0, validateTypes_1.safeValidate)(newOpts.type, res);
        }
        else {
            res.hasRequestedType = true;
        }
    }
    return awaitedResult;
}
