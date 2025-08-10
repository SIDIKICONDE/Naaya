"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockDocPickerResponse = void 0;
exports.mockDocPickerResponse = {
    uri: 'file:///mock/uri/mockName.pdf',
    name: 'mockName.pdf',
    type: 'application/pdf',
    nativeType: 'com.adobe.pdf',
    size: 1234,
    error: null,
    isVirtual: false,
    convertibleToMimeTypes: null,
    hasRequestedType: true,
};
function mockFactory() {
    const mockNativeModule = Object.freeze({
        isKnownType: jest.fn().mockReturnValue({
            isKnown: false,
            UTType: null,
            preferredFilenameExtension: null,
            mimeType: null,
        }),
        keepLocalCopy: jest.fn().mockImplementation(async (options) => {
            const mockCopyResults = options.files.map(({ uri, fileName }) => ({
                sourceUri: uri,
                localUri: `file:///mock/uri/${fileName}`,
                status: 'success',
            }));
            return mockCopyResults;
        }),
        pick: jest.fn().mockResolvedValue([exports.mockDocPickerResponse]),
        pickDirectory: jest.fn().mockResolvedValue({
            uri: 'file:///mock/uri/mockDirectory',
        }),
        saveDocument: jest
            .fn()
            .mockResolvedValue([exports.mockDocPickerResponse]),
        writeDocuments: jest
            .fn()
            .mockResolvedValue([exports.mockDocPickerResponse]),
        releaseSecureAccess: jest.fn().mockResolvedValue(null),
        releaseLongTermAccess: jest.fn().mockResolvedValue([]),
    });
    return {
        NativeDocumentPicker: mockNativeModule,
    };
}
jest.mock('../src/spec/NativeDocumentPicker', () => mockFactory());
// the following are for jest testing outside of the library, where the paths are different
// alternative is to use moduleNameMapper in user space
const mockModulePaths = [
    '../../../lib/commonjs/spec/NativeDocumentPicker',
    '../../../lib/module/spec/NativeDocumentPicker',
];
mockModulePaths.forEach((path) => {
    try {
        require.resolve(path);
        jest.mock(path, () => mockFactory());
    }
    catch (error) {
        if ('code' in error && error.code === 'MODULE_NOT_FOUND') {
            if (!process.env.SILENCE_MOCK_NOT_FOUND) {
                console.warn(`Unable to resolve ${path}`);
            }
        }
        else {
            throw error;
        }
    }
});
