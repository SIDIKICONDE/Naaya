package com.naaya;

import android.app.Application;
import com.naaya.camera.LegacyVideoRecorder;

public class NaayaApplication extends Application {
  @Override
  public void onCreate() {
    super.onCreate();
    LegacyVideoRecorder.initialize(this);
  }
}
