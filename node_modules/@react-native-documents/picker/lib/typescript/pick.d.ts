import { PredefinedFileTypes } from './fileTypes';
import type { BookmarkingResponse, DocumentPickerResponse, NonEmptyArray, TransitionStyle, PresentationStyle } from './types';
/**
 * Base options object for the document picker.
 * You'd rarely use this type directly, but instead use one of
 *
 * {@link DocumentPickerOptionsImport}, {@link DocumentPickerOptionsOpenOnce} or {@link DocumentPickerOptionsOpenLongTerm}
 *
 * which extend this type
 * @group pick() types
 */
export type DocumentPickerOptionsBase = {
    /**
     * Specify file type(s) that you want to pick. Use `types` for some predefined values.
     * */
    type?: string | PredefinedFileTypes | Array<PredefinedFileTypes | string>;
    /**
     * Whether to allow multiple files to be picked. False by default.
     * */
    allowMultiSelection?: boolean;
    /**
     * Android only - Whether to allow virtual files (such as Google docs or sheets) to be picked. False by default.
     * */
    allowVirtualFiles?: boolean;
    /**
     * iOS only - Controls how the picker is presented, e.g. on an iPad you may want to present it fullscreen. Defaults to `pageSheet`.
     * */
    presentationStyle?: PresentationStyle;
    /**
     * iOS only - Configures the transition style of the picker. Defaults to coverVertical, when the picker is presented, its view slides up from the bottom of the screen.
     * */
    transitionStyle?: TransitionStyle;
};
/**
 * Present the document picker in import mode.
 *
 * @group pick() types
 */
export type DocumentPickerOptionsImport = DocumentPickerOptionsBase & {
    mode?: 'import';
    requestLongTermAccess?: never;
};
/**
 * Present the document picker in open mode, with permissions to access the file for a limited time (until the app terminates).
 *
 * @group pick() types
 */
export type DocumentPickerOptionsOpenOnce = DocumentPickerOptionsBase & {
    mode: 'open';
    requestLongTermAccess?: false;
};
/**
 * Present the document picker in open mode, with long-term permissions to access the opened file.
 *
 * @group pick() types
 */
export type DocumentPickerOptionsOpenLongTerm = DocumentPickerOptionsBase & {
    mode: 'open';
    requestLongTermAccess: true;
};
type DocumentPickerOptionsOpen = DocumentPickerOptionsOpenOnce | DocumentPickerOptionsOpenLongTerm;
/**
 * @hidden
 */
export type DocumentPickerOptions = DocumentPickerOptionsImport | DocumentPickerOptionsOpen;
/**
 * The result of calling {@link pick} with `mode: 'open'` and `requestLongTermAccess: true`
 *
 * @group pick() types
 */
export type DocumentPickerResponseOpenLongTerm = DocumentPickerResponse & BookmarkingResponse;
type PickResponse<O extends DocumentPickerOptions> = Promise<O extends DocumentPickerOptionsOpenLongTerm ? NonEmptyArray<DocumentPickerResponseOpenLongTerm> : NonEmptyArray<DocumentPickerResponse>>;
/**
 * The method for picking a file, both for `import` and `open` modes.
 *
 * For result types, see {@link DocumentPickerResponse} or {@link DocumentPickerResponseOpenLongTerm}.
 *
 * For options, see {@link DocumentPickerOptionsImport}, {@link DocumentPickerOptionsOpenOnce} or {@link DocumentPickerOptionsOpenLongTerm}.
 *
 * @group DocumentPicker
 * */
export declare function pick<O extends DocumentPickerOptions>(options?: O): PickResponse<O>;
export {};
//# sourceMappingURL=pick.d.ts.map