// Déclarations minimales pour corriger la résolution de types en attendant les types complets

declare module '@react-native-community/slider' {
  import * as React from 'react';
  import { ColorValue, StyleProp, ViewStyle } from 'react-native';

  export interface SliderProps {
    value?: number;
    onValueChange?: (value: number) => void;
    minimumValue?: number;
    maximumValue?: number;
    step?: number;
    minimumTrackTintColor?: ColorValue;
    maximumTrackTintColor?: ColorValue;
    thumbTintColor?: ColorValue;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
  }

  const Slider: React.ComponentType<SliderProps>;
  export default Slider;
}

declare module 'lucide-react-native' {
  import * as React from 'react';
  import { ColorValue } from 'react-native';

  export interface IconProps {
    size?: number | string;
    color?: ColorValue | string;
    strokeWidth?: number | string;
  }

  export const Download: React.ComponentType<IconProps>;
  export const Upload: React.ComponentType<IconProps>;
  export const Info: React.ComponentType<IconProps>;
  export const BarChart3: React.ComponentType<IconProps>;
  export const HelpCircle: React.ComponentType<IconProps>;
  export const Sliders: React.ComponentType<IconProps>;
  export const X: React.ComponentType<IconProps>;
}


// Types minimaux pour "react-native-svg" afin d'éviter les erreurs d'exports nommés
declare module 'react-native-svg' {
  import * as React from 'react';

  export interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    children?: React.ReactNode;
  }

  const Svg: React.ComponentType<SvgProps>;
  export default Svg;

  export interface CommonElementProps {
    fill?: string;
    stroke?: string;
    strokeWidth?: number | string;
    transform?: string;
    x?: number | string;
    y?: number | string;
    cx?: number | string;
    cy?: number | string;
    r?: number | string;
    x1?: number | string;
    y1?: number | string;
    x2?: number | string;
    y2?: number | string;
    d?: string;
    opacity?: number;
    strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit' | string;
    strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit' | string;
    strokeDasharray?: string | number[];
    children?: React.ReactNode;
  }

  export const Defs: React.ComponentType<CommonElementProps>;
  export const G: React.ComponentType<CommonElementProps>;
  export const Circle: React.ComponentType<CommonElementProps>;
  export const Line: React.ComponentType<CommonElementProps>;
  export const Path: React.ComponentType<CommonElementProps>;
  export const Stop: React.ComponentType<{ offset?: string | number; stopColor?: string; stopOpacity?: number | string }>;
  export const LinearGradient: React.ComponentType<{ id?: string; x1?: string | number; y1?: string | number; x2?: string | number; y2?: string | number; children?: React.ReactNode }>;
  export const Text: React.ComponentType<{ x?: number | string; y?: number | string; fill?: string; fontSize?: number | string; textAnchor?: 'start' | 'middle' | 'end' | string; children?: React.ReactNode }>;
}


// Shim minimal pour react-native-gesture-handler si les types manquent
declare module 'react-native-gesture-handler' {
  import * as React from 'react';
  import { ViewProps, ViewStyle } from 'react-native';

  export const GestureHandlerRootView: React.ComponentType<ViewProps>;
  export const GestureDetector: React.ComponentType<{
    gesture: any;
    children?: React.ReactNode;
    style?: ViewStyle;
  } & ViewProps>;

  // API Gestures (stubs)
  export namespace Gesture {
    function Pan(): any;
    function Pinch(): any;
    function Rotation(): any;
    function Tap(): any;
    function LongPress(): any;
    function Simultaneous(...args: any[]): any;
    function Race(...args: any[]): any;
    function Manual(): any;
  }

  // Types d'évènements (stubs)
  export type GestureStateChangeEvent<T = any> = T;
  export type GestureUpdateEvent<T = any> = T;
  export type PanGestureHandlerEventPayload = {
    translationX: number;
    translationY: number;
    velocityX?: number;
    velocityY?: number;
    numberOfPointers: number;
  };
  export type PinchGestureHandlerEventPayload = {
    scale: number;
    focalX?: number;
    focalY?: number;
  };
  export type RotationGestureHandlerEventPayload = {
    rotation: number;
    anchorX?: number;
    anchorY?: number;
  };
}


