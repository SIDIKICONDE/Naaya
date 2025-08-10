declare const mimeTypes: Readonly<{
    readonly allFiles: "*/*";
    readonly audio: "audio/*";
    readonly csv: readonly ["text/csv", "text/comma-separated-values"];
    readonly doc: "application/msword";
    readonly docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    readonly images: "image/*";
    readonly pdf: "application/pdf";
    readonly plainText: "text/plain";
    readonly json: "application/json";
    readonly ppt: "application/vnd.ms-powerpoint";
    readonly pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    readonly video: "video/*";
    readonly xls: "application/vnd.ms-excel";
    readonly xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    readonly zip: "application/zip";
}>;
declare const utis: Readonly<{
    readonly allFiles: "public.item";
    readonly audio: "public.audio";
    readonly csv: "public.comma-separated-values-text";
    readonly doc: "com.microsoft.word.doc";
    readonly docx: "org.openxmlformats.wordprocessingml.document";
    readonly images: "public.image";
    readonly pdf: "com.adobe.pdf";
    readonly plainText: "public.plain-text";
    readonly json: "public.json";
    readonly ppt: "com.microsoft.powerpoint.ppt";
    readonly pptx: "org.openxmlformats.presentationml.presentation";
    readonly video: "public.movie";
    readonly xls: "com.microsoft.excel.xls";
    readonly xlsx: "org.openxmlformats.spreadsheetml.sheet";
    readonly zip: "public.zip-archive";
}>;
/**
 * @hidden
 * */
export declare const types: Readonly<{
    readonly allFiles: "*/*";
    readonly audio: "audio/*";
    readonly csv: readonly ["text/csv", "text/comma-separated-values"];
    readonly doc: "application/msword";
    readonly docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    readonly images: "image/*";
    readonly pdf: "application/pdf";
    readonly plainText: "text/plain";
    readonly json: "application/json";
    readonly ppt: "application/vnd.ms-powerpoint";
    readonly pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    readonly video: "video/*";
    readonly xls: "application/vnd.ms-excel";
    readonly xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    readonly zip: "application/zip";
}> | Readonly<{
    readonly allFiles: "public.item";
    readonly audio: "public.audio";
    readonly csv: "public.comma-separated-values-text";
    readonly doc: "com.microsoft.word.doc";
    readonly docx: "org.openxmlformats.wordprocessingml.document";
    readonly images: "public.image";
    readonly pdf: "com.adobe.pdf";
    readonly plainText: "public.plain-text";
    readonly json: "public.json";
    readonly ppt: "com.microsoft.powerpoint.ppt";
    readonly pptx: "org.openxmlformats.presentationml.presentation";
    readonly video: "public.movie";
    readonly xls: "com.microsoft.excel.xls";
    readonly xlsx: "org.openxmlformats.spreadsheetml.sheet";
    readonly zip: "public.zip-archive";
}>;
type ValuesOf<T> = T[keyof T];
type Flatten<T> = T extends Array<infer U> ? U : T;
type AllMimeTypes = Flatten<ValuesOf<typeof mimeTypes>>;
type AllAppleUTIs = ValuesOf<typeof utis>;
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
export type PredefinedFileTypes = Flatten<AllMimeTypes> | AllAppleUTIs;
export declare const typesAreEqual: true;
export {};
//# sourceMappingURL=fileTypes.d.ts.map