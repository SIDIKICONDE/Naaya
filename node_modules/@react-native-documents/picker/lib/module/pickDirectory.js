"use strict";

import { Platform } from 'react-native';
import { NativeDocumentPicker } from './spec/NativeDocumentPicker';

/**
 * Base options object for the directory picker. They only slightly influence the appearance of the picker modal on iOS.
 * You'd rarely use this type directly, but instead use {@link DirectoryPickerOptions}
 *
 * which extend this type
 * @group pickDirectory() types
 */

/**
 * @hidden
 * */

/**
 * Options for {@link pickDirectory}.
 *
 * @group pickDirectory() types
 * */

/**
 * This object represents the response from the directory picker, when long-term access was not requested.
 *
 * @group pickDirectory() types
 * */

/**
 * This object represents the response from the directory picker, when long-term access was requested.
 *
 * @group pickDirectory() types
 * */

// TODO not entirely sure this is a good idea but let's try
/**
 * You likely won't use this type directly, but instead use {@link DirectoryPickerResponse} or {@link DirectoryPickerResponseLongTerm}.
 *
 * @group pickDirectory() types
 * */

/**
 * Opens a directory picker.
 *
 * @group DocumentPicker
 * */
export async function pickDirectory(options) {
  const optionsOverride = (() => {
    if (Platform.OS === 'ios') {
      return {
        ...options,
        mode: 'open',
        allowMultiSelection: false,
        type: ['public.folder']
      };
    } else {
      return {
        // technically, "mode" is ignored here, and we shouldn't need to specify anything but the PickOptions data class
        // requires mode to be set
        mode: 'open',
        ...options
      };
    }
  })();
  return NativeDocumentPicker.pickDirectory(optionsOverride);
}
//# sourceMappingURL=pickDirectory.js.map