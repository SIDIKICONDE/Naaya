"use strict";

import { NativeDocumentPicker } from './spec/NativeDocumentPicker';

/**
 * Parameter of {@link keepLocalCopy}. Object type representing the file(s) whose copy should be kept in the app's storage.
 * */

/**
 * options for {@link keepLocalCopy}
 *
 * */

/**
 * Result of the call to {@link keepLocalCopy}. Please note the promise always resolves, even if there was an error processing any uri(s) (as indicated by the `status` field, and `copyError` field).
 * */

/**
 * Makes the file available in the app's storage. The behavior is different on iOS and Android, and for simple use cases (such as uploading file to remote server), you may not need to call this method at all.
 *
 * On Android, it can be used to "convert" a `content://` Uri into a local file. It also "exports" virtual files (such as Google docs or sheets) into local files.
 *
 * However, note that for some use cases, such as uploading the picked file to a server, you may not need to call `keepLocalCopy` at all. React Native's `fetch` can handle `content://` uris.
 *
 * @group DocumentPicker
 * */
export function keepLocalCopy(options) {
  const response = NativeDocumentPicker.keepLocalCopy(options);
  return response;
}
//# sourceMappingURL=keepLocalCopy.js.map