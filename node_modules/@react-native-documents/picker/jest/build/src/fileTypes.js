"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typesAreEqual = exports.types = void 0;
const react_native_1 = require("react-native");
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
    zip: 'application/zip',
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
    zip: 'public.zip-archive',
}); // satisfies TypeOfFileTypes
const perPlatformTypes = {
    android: mimeTypes,
    ios: utis,
    // unsupported, but added to make TS happy
    macos: utis,
    windows: mimeTypes,
    web: mimeTypes,
};
/**
 * @hidden
 * */
exports.types = perPlatformTypes[react_native_1.Platform.OS];
const mimesAndUtisAreEqual = true;
exports.typesAreEqual = mimesAndUtisAreEqual;
