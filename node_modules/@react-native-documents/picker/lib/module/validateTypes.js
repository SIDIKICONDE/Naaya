"use strict";

export const safeValidate = (requestedTypes, singlePickResult) => {
  const {
    nativeType
  } = singlePickResult;
  return requestedTypes.some(it => nativeTypeMatches(it, nativeType));
};
const nativeTypeMatches = (requiredType, actualType) => {
  if (requiredType === actualType || requiredType === '*/*') {
    return true;
  }
  if (actualType === null) {
    return false;
  }
  if (requiredType.endsWith('/*')) {
    const requiredTypeWithoutStar = requiredType.slice(0, -2);
    if (actualType.startsWith(requiredTypeWithoutStar)) {
      return true;
    }
  }
  return false;
};
//# sourceMappingURL=validateTypes.js.map