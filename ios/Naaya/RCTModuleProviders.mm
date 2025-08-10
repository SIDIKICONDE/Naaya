/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <Foundation/Foundation.h>

#import "RCTModuleProviders.h"

// Environnements où les headers React peuvent ne pas être résolus par l'analyseur (lint)
// Utiliser des gardes pour éviter les faux positifs tout en conservant la compilation Xcode.
#if __has_include(<ReactCommon/RCTTurboModule.h>)
#import <ReactCommon/RCTTurboModule.h>
#endif

#if __has_include(<React/RCTLog.h>)
#import <React/RCTLog.h>
#elif __has_include(<React/RCTUtils.h>)
#import <React/RCTUtils.h>
#endif

#import "NativeCameraModuleProvider.h"

@implementation RCTModuleProviders

+ (NSDictionary<NSString *, id<RCTModuleProvider>> *)moduleProviders
{
  static NSDictionary<NSString *, id<RCTModuleProvider>> *providers = nil;
  static dispatch_once_t onceToken;

  dispatch_once(&onceToken, ^{
    NSDictionary<NSString *, NSString *> * moduleMapping = @{
      		@"NativeCameraModule": @"NativeCameraModuleProvider", // Naaya
		@"NativeCameraFiltersModule": @"NativeCameraFiltersModuleProvider", // Naaya
		@"NativeAudioEqualizerModule": @"NativeAudioEqualizerModuleProvider", // Naaya
    };

    NSMutableDictionary *dict = [[NSMutableDictionary alloc] initWithCapacity:moduleMapping.count];

    for (NSString *key in moduleMapping) {
      NSString * moduleProviderName = moduleMapping[key];
      Class klass = NSClassFromString(moduleProviderName);
      if (!klass) {
#if __has_include(<React/RCTLog.h>)
        RCTLogError(@"Module provider %@ cannot be found in the runtime", moduleProviderName);
#else
        NSLog(@"[RCTModuleProviders] Module provider %@ cannot be found in the runtime", moduleProviderName);
#endif
        continue;
      }

      id instance = [klass new];
      if (![instance respondsToSelector:@selector(getTurboModule:)]) {
#if __has_include(<React/RCTLog.h>)
        RCTLogError(@"Module provider %@ does not conform to RCTModuleProvider", moduleProviderName);
#else
        NSLog(@"[RCTModuleProviders] Module provider %@ does not conform to RCTModuleProvider", moduleProviderName);
#endif
        continue;
      }

      [dict setObject:instance forKey:key];
    }

    providers = dict;
  });

  return providers;
}

@end
