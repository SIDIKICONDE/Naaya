"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.typesAreEqual = void 0;
/**
 * If you've requested long-term access to a directory or file, this object will be returned in the response.
 * In order to access the same directory or file in the future, you must store the `bookmark` opaque string,
 * and then pass it to the document viewer if you want to preview the file.
 *
 * See the Document viewer source on how to retrieve the file from the bookmark, if you need to do that (advanced use case).
 * */

/**
 * @group pick() types
 */

/**
 * @group pick() types
 */

/**
 * iOS only. Configure the transition style of the picker.
 * */

/**
 * iOS only. Configure the presentation style of the picker.
 * */

/*
 * really, PresentationStyle shouldn't be here and we should just use ModalPropsIOS['presentationStyle']>
 * but I'm not sure how to get that working with TypeDoc producing a nice output so we duplicate it here
 * */

const typesAreEqual = exports.typesAreEqual = true;
//# sourceMappingURL=types.js.map