"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pickDirectory = pickDirectory;
var _reactNative = require("react-native");
var _NativeDocumentPicker = require("./spec/NativeDocumentPicker");
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
async function pickDirectory(options) {
  const optionsOverride = (() => {
    if (_reactNative.Platform.OS === 'ios') {
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
  return _NativeDocumentPicker.NativeDocumentPicker.pickDirectory(optionsOverride);
}
//# sourceMappingURL=pickDirectory.js.map