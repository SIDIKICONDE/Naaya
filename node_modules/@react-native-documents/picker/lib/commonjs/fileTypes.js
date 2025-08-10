"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.typesAreEqual = exports.types = void 0;
var _reactNative = require("react-native");
// TODO split this into platform-specific files, and / or topic-specific files

const mimeTypes = Object.freeze({
  allFiles: '*/*',
  audio: 'audio/*',
  csv: ['text/csv', 'text/comma-separated-values'],
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  images: 'image/*',
  pdf: 'application/pdf',
  plainText: 'text/plain',
  json: 'application/json',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  video: 'video/*',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip'
}); //satisfies TypeOfFileTypes

const utis = Object.freeze({
  allFiles: 'public.item',
  audio: 'public.audio',
  csv: 'public.comma-separated-values-text',
  doc: 'com.microsoft.word.doc',
  docx: 'org.openxmlformats.wordprocessingml.document',
  images: 'public.image',
  pdf: 'com.adobe.pdf',
  plainText: 'public.plain-text',
  json: 'public.json',
  ppt: 'com.microsoft.powerpoint.ppt',
  pptx: 'org.openxmlformats.presentationml.presentation',
  video: 'public.movie',
  xls: 'com.microsoft.excel.xls',
  xlsx: 'org.openxmlformats.spreadsheetml.sheet',
  zip: 'public.zip-archive'
}); // satisfies TypeOfFileTypes

const perPlatformTypes = {
  android: mimeTypes,
  ios: utis,
  // unsupported, but added to make TS happy
  macos: utis,
  windows: mimeTypes,
  web: mimeTypes
};

/**
 * @hidden
 * */
const types = exports.types = perPlatformTypes[_reactNative.Platform.OS];

/**
 * You'd rarely use this type directly.
 * It represents the predefined file types which are exported as `types` and can be used to limit the kinds of files that can be picked.
 *
 * @example
 * ```ts
 * import {
 *   pick,
 *   types,
 * } from '@react-native-documents/picker'
 * // ...
 * const result = await pick({
 *   type: [types.pdf, types.docx],
 * })
 * ```
 * */

// export type PlatformTypes = typeof perPlatformTypes

// ensure shapes of platformTypes are the same: https://stackoverflow.com/a/67027347/2070942
// let me know if there's a nicer way

const mimesAndUtisAreEqual = true;
const typesAreEqual = exports.typesAreEqual = mimesAndUtisAreEqual;
//# sourceMappingURL=fileTypes.js.map