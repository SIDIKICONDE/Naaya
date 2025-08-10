"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keepLocalCopy = keepLocalCopy;
const NativeDocumentPicker_1 = require("./spec/NativeDocumentPicker");
/**
 * Makes the file available in the app's storage. The behavior is different on iOS and Android, and for simple use cases (such as uploading file to remote server), you may not need to call this method at all.
 *
 * On Android, it can be used to "convert" a `content://` Uri into a local file. It also "exports" virtual files (such as Google docs or sheets) into local files.
 *
 * However, note that for some use cases, such as uploading the picked file to a server, you may not need to call `keepLocalCopy` at all. React Native's `fetch` can handle `content://` uris.
 *
 * @group DocumentPicker
 * */
function keepLocalCopy(options) {
    const response = NativeDocumentPicker_1.NativeDocumentPicker.keepLocalCopy(options);
    return response;
}
