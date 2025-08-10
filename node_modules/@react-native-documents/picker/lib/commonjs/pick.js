"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.pick = pick;
var _NativeDocumentPicker = require("./spec/NativeDocumentPicker");
var _fileTypes = require("./fileTypes");
var _reactNative = require("react-native");
var _validateTypes = require("./validateTypes");
/**
 * Base options object for the document picker.
 * You'd rarely use this type directly, but instead use one of
 *
 * {@link DocumentPickerOptionsImport}, {@link DocumentPickerOptionsOpenOnce} or {@link DocumentPickerOptionsOpenLongTerm}
 *
 * which extend this type
 * @group pick() types
 */

/**
 * Present the document picker in import mode.
 *
 * @group pick() types
 */

/**
 * Present the document picker in open mode, with permissions to access the file for a limited time (until the app terminates).
 *
 * @group pick() types
 */

/**
 * Present the document picker in open mode, with long-term permissions to access the opened file.
 *
 * @group pick() types
 */

/**
 * @hidden
 */

/**
 * The result of calling {@link pick} with `mode: 'open'` and `requestLongTermAccess: true`
 *
 * @group pick() types
 */

// TODO not entirely sure this is a good idea but let's try

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
      return [_fileTypes.types.allFiles];
    }
    const newType = Array.isArray(options.type) ? options.type : [options.type];
    return newType.flat().map(it => it.trim());
  })();
  const newOpts = {
    mode: 'import',
    // allowMultiSelection must be false to maintain old (v5) behavior
    allowMultiSelection: false,
    allowVirtualFiles: false,
    ...options,
    type
  };
  if (!newOpts.type.every(it => typeof it === 'string')) {
    throw new TypeError(`Unexpected type option in ${newOpts.type}, did you try using a DocumentPicker.types.* that does not exist?`);
  }
  if ('mode' in newOpts && !['import', 'open'].includes(newOpts.mode)) {
    throw new TypeError('Invalid mode option: ' + newOpts.mode);
  }
  const response = _NativeDocumentPicker.NativeDocumentPicker.pick(newOpts);
  const awaitedResult = await response;
  for (const res of awaitedResult) {
    if (_reactNative.Platform.OS === 'android') {
      res.hasRequestedType = (0, _validateTypes.safeValidate)(newOpts.type, res);
    } else {
      res.hasRequestedType = true;
    }
  }
  return awaitedResult;
}
//# sourceMappingURL=pick.js.map