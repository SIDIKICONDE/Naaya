Minimal creative audio effects engine for Naaya.

Components:
- EffectBase.h: base interface `IAudioEffect`
- Compressor.h: simple feed-forward compressor with RMS-like envelope
- Delay.h: basic delay with feedback and mix
- EffectChain.h: chain multiple effects with mono/stereo processing

Integrated on Android (AudioEQBridge.cpp) and iOS (VideoCaptureIOS.mm).

