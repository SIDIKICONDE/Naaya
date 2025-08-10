"use strict";

import { NativeDocumentPicker } from './spec/NativeDocumentPicker';

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
export function isKnownType(options) {
  const {
    kind,
    value
  } = options;
  const result = NativeDocumentPicker.isKnownType(kind, value);
  return result;
}
//# sourceMappingURL=isKnownType.js.map