package com.stepsensor

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext

abstract class StepSensorSpec internal constructor(context: ReactApplicationContext) : NativeStepCounterSpec(context) {
    override fun getName(): String = "StepSensor"

    abstract override fun isStepSensorSupported(promise: Promise)

    abstract override fun startStepSensorUpdate(from: Double)

    abstract override fun stopStepSensorUpdate()

    override fun addListener(eventName: String) {
    }

    override fun removeListeners(count: Double) {
    }
}