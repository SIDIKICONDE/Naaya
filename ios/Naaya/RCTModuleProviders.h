/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#ifdef __OBJC__
#import <Foundation/Foundation.h>

// Fallback pour les environnements sans React Native
#if __has_include(<ReactCommon/RCTTurboModule.h>)
#import <ReactCommon/RCTTurboModule.h>
#else
@protocol RCTModuleProvider;
#endif

NS_ASSUME_NONNULL_BEGIN

@interface RCTModuleProviders : NSObject

+ (NSDictionary<NSString *, id<RCTModuleProvider>> *)moduleProviders;

@end

NS_ASSUME_NONNULL_END
#endif
