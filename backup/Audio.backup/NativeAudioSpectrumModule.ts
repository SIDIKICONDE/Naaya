import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  readonly start: () => void;
  readonly stop: () => void;
  readonly getData: () => number[];
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAudioSpectrumModule');


