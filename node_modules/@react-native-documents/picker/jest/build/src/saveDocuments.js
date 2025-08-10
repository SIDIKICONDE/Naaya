"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveDocuments = saveDocuments;
const NativeDocumentPicker_1 = require("./spec/NativeDocumentPicker");
const react_native_1 = require("react-native");
/**
 * The method for opening a "save as" dialog and saving source file(s) to a new location.
 *
 * On Android, only one file can be saved at a time.
 *
 * @group DocumentPicker
 * */
async function saveDocuments(options) {
    const writeDocumentResponse = await (async () => {
        if (react_native_1.Platform.OS === 'android') {
            const length = options.sourceUris.length;
            if (length > 1) {
                console.warn(`DocumentPicker.saveDocuments: Android only allows to save one file at a time.\n
      You provided an array with ${length} entries.`);
            }
            // making this division into 2 calls might be an overkill... but who knows
            const objectWithSingleUri = await NativeDocumentPicker_1.NativeDocumentPicker.saveDocument(options);
            const response = await NativeDocumentPicker_1.NativeDocumentPicker.writeDocuments(objectWithSingleUri);
            return response;
        }
        else {
            return NativeDocumentPicker_1.NativeDocumentPicker.writeDocuments(options);
        }
    })();
    return writeDocumentResponse.map(keepOnlySpecifiedFields);
}
function keepOnlySpecifiedFields(source) {
    return {
        uri: source.uri,
        name: source.name,
        error: source.error,
        // type: source.type,
        // nativeType: source.nativeType,
    };
}
