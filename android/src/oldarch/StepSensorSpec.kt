package com.stepsensor

import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = "StepSensor")
abstract class StepSensorSpec internal constructor(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    @ReactMethod
    @DoNotStrip
    abstract fun isStepSensorSupported(promise: Promise)

    @ReactMethod
    @DoNotStrip
    abstract fun startStepSensorUpdate(from: Double)

    @ReactMethod
    @DoNotStrip
    abstract fun stopStepSensorUpdate()

    @ReactMethod
    @DoNotStrip
    abstract fun addListener(eventName: String)

    @ReactMethod
    @DoNotStrip
    abstract fun removeListeners(count: Double)
}