"use strict";

import { NativeDocumentPicker } from './spec/NativeDocumentPicker';
import { Platform } from 'react-native';

/**
 * Options object for the {@link saveDocuments} method. `sourceUris` is the only required field.
 *
 * @group saveDocuments() types
 */

/**
 * The result of calling {@link saveDocuments}. It is very unlikely that the metadata fields would be `null`, but in theory, it can happen.
 *
 * @group saveDocuments() types
 */

/**
 * The method for opening a "save as" dialog and saving source file(s) to a new location.
 *
 * On Android, only one file can be saved at a time.
 *
 * @group DocumentPicker
 * */
export async function saveDocuments(options) {
  const writeDocumentResponse = await (async () => {
    if (Platform.OS === 'android') {
      const length = options.sourceUris.length;
      if (length > 1) {
        console.warn(`DocumentPicker.saveDocuments: Android only allows to save one file at a time.\n
      You provided an array with ${length} entries.`);
      }
      // making this division into 2 calls might be an overkill... but who knows
      const objectWithSingleUri = await NativeDocumentPicker.saveDocument(options);
      const response = await NativeDocumentPicker.writeDocuments(objectWithSingleUri);
      return response;
    } else {
      return NativeDocumentPicker.writeDocuments(options);
    }
  })();
  return writeDocumentResponse.map(keepOnlySpecifiedFields);
}
function keepOnlySpecifiedFields(source) {
  return {
    uri: source.uri,
    name: source.name,
    error: source.error
    // type: source.type,
    // nativeType: source.nativeType,
  };
}
//# sourceMappingURL=saveDocuments.js.map