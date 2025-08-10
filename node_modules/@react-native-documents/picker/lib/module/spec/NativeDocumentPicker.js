"use strict";

import { TurboModuleRegistry } from 'react-native';

/**
 * Indicates, for each Uri that was passed to {@link keepLocalCopy}, whether the local copy was successfully created or not.
 *
 * If the copy was successful, the status field is `success` and `localUri` contains the local Uri.
 * If the copy was not successful, the status field is `error` and `copyError` field contains the error message.
 * */

export const NativeDocumentPicker = TurboModuleRegistry.getEnforcing('RNDocumentPicker');
//# sourceMappingURL=NativeDocumentPicker.js.map