package com.stepsensor

import android.content.Context
import android.hardware.SensorManager
import android.os.Build.VERSION_CODES
import android.util.Log
import androidx.core.content.PermissionChecker.PERMISSION_GRANTED
import androidx.core.content.PermissionChecker.checkSelfPermission
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import com.stepsensor.StepSensorSpec
import com.stepsensor.services.AccelerometerService
import com.stepsensor.services.SensorListenService
import com.stepsensor.services.StepSensorService
import com.stepsensor.utils.AndroidVersionHelper

/**
 * This class is the native module for the react-native-step-sensor package.
 *
 * It is responsible for the communication between the native and the react-native code.
 * @param context The context of the react-native application
 * @property appContext The context of the react-native application from [context][com.facebook.react.bridge.ReactApplicationContext]
 * @property sensorManager The sensor manager that is responsible for the sensor
 * @property stepSensorListener The service that is responsible for the step sensor
 * @constructor Creates a new StepSensorModule implements StepSensorSpec
 * @see ReactContextBaseJavaModule
 * @see ReactApplicationContext
 * @see StepSensorSpec
 */
class StepSensorModule internal constructor(context: ReactApplicationContext) :
    StepSensorSpec(context) {
    companion object {
        const val NAME: String = "StepSensor"
        private val TAG_NAME: String = StepSensorModule::class.java.name
        private const val STEP_SENSOR = "android.permission.ACTIVITY_RECOGNITION"
    }

    private val appContext: ReactApplicationContext = context
    private val sensorManager: SensorManager
    private val stepsOK: Boolean
        get() = checkSelfPermission(appContext, STEP_SENSOR) == PERMISSION_GRANTED
    private val accelOK: Boolean
        get() = AndroidVersionHelper.isHardwareAccelerometerEnabled(appContext)
    private val supported: Boolean
        get() = AndroidVersionHelper.isHardwareStepCounterEnabled(appContext)
    private val walkingStatus: Boolean
        get() = stepSensorListener !== null

    /**
     * gets the step sensor listener
     * @return the step sensor listener
     * @see SensorListenService
     * @see StepSensorService
     * @see AccelerometerService
     * @see checkSelfPermission
     * @see PERMISSION_GRANTED
     */
    private var stepSensorListener: SensorListenService? = null

    /**
     * The method that is called when the module is initialized.
     * It checks the permission and the availability for the step sensor and initializes the step sensor service.
     */
    init {
        sensorManager = context.getSystemService(
            Context.SENSOR_SERVICE
        ) as SensorManager
        stepSensorListener = if (stepsOK) {
            StepSensorService(this, sensorManager)
        } else {
            AccelerometerService(this, sensorManager)
        }
        appContext.addLifecycleEventListener(stepSensorListener)
    }

    /**
     * The method ask if the step sensor is supported.
     * @param promise the promise that is used to return the result to the react-native code
     * @see Promise.resolve
     * @see VERSION_CODES.ECLAIR
     * @see VERSION_CODES.KITKAT
     * @see WritableMap
     */
    @ReactMethod
    override fun isStepSensorSupported(promise: Promise) {
        // Log.d(TAG_NAME, "hardware_step_counter? $supported")
        // Log.d(TAG_NAME, "step_counter granted? $stepsOK")
        // Log.d(TAG_NAME, "accelerometer granted? $accelOK")
        sendDeviceEvent("stepDetected", walkingStatus)
        promise.resolve(
            Arguments.createMap().apply {
                putBoolean("supported", supported)
                putBoolean("granted", stepsOK || accelOK)
                putBoolean("working", walkingStatus)
            }
        )
    }

    /**
     * Start the step sensor.
     * @param from the number of steps to start from
     */
    @ReactMethod
    override fun startStepSensorUpdate(from: Double) {
        stepSensorListener = stepSensorListener ?: if (stepsOK) {
            StepSensorService(this, sensorManager)
        } else {
            AccelerometerService(this, sensorManager)
        }
        // Log.d(TAG_NAME, "startStepSensorUpdate")
        stepSensorListener!!.startService()
    }

    /**
     * Stop the step sensor.
     * @return Nothing.
     */
    @ReactMethod
    override fun stopStepSensorUpdate() {
        // Log.d(TAG_NAME, "stopStepSensorUpdate")
        stepSensorListener!!.stopService()
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param eventName the name of the event. usually "stepSensorUpdate".
     */
    @ReactMethod
    override fun addListener(eventName: String) {
    }

    /**
     * Keep: Required for RN built in Event Emitter Support.
     * @param count the number of listeners to remove.
     * not implemented.
     */
    @ReactMethod
    override fun removeListeners(count: Double) {
    }

    /**
     * StepSensorPackage requires this property for the module.
     * @return the name of the module. usually "StepSensor".
     */
    override fun getName(): String = NAME

    /**
     * Send the step sensor update event to the react-native code.
     * @param eventPayload the object that contains information about the step sensor update.
     * @return Nothing.
     * @see WritableMap
     * @see RCTDeviceEventEmitter
     * @see com.facebook.react.modules.core.DeviceEventManagerModule
     * @throws RuntimeException if the event emitter is not initialized.
     */
    fun sendDeviceEvent(eventType: String, eventPayload: Any) {
        try {
            appContext.getJSModule(RCTDeviceEventEmitter::class.java)
                .emit("$NAME.$eventType", eventPayload)
        } catch (e: RuntimeException) {
            e.message?.let { Log.e(TAG_NAME, it) }
            // Log.e(TAG_NAME, eventType, e)
        }
    }
}