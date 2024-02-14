import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { EmitterSubscription as Subscription } from 'react-native';
import type { StepSensorData, Spec } from './NativeStepSensor';
import { eventName, VERSION, NAME } from './NativeStepSensor';

/* A way to check if the module is linked. */
const LINKING_ERROR =
  "The package 'react-native-step-sensor' doesn't seem to be linked.";

export interface ParsedStepSensorData {
  dailyGoal: string;
  steps: number;
  stepsString: string;
  calories: string;
  startDate: string;
  endDate: string;
  startDateStr: string;
  endDateStr: string;
  startDateFull: string;
  endDateFull: string;
  distance: string;
}

/**
 * We keep TurboModuleManager alive until the JS VM is deleted.
 * It is perfectly valid to only use/create TurboModules from JS.
 * In such a case, we shouldn't de-alloc TurboModuleManager if there
 * aren't any strong references to it in ObjC. Hence, we give
 * __turboModuleProxy a strong reference to TurboModuleManager.
 * @see https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/TurboModule/TurboModuleRegistry.js
 * @see https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/platform/ios/RCTTurboModuleManager.mm
 * @see https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/react/nativemodule/core/ReactCommon/TurboModuleBinding.cpp
 */
// @ts-ignore
const isTurboModuleEnabled = global.__turboModuleProxy != null;

/**
 * The `StepSensorModule` constant is used to import the native module `NativeStepSensor` if
 * TurboModules are enabled. If TurboModules are not enabled, it falls back to using the
 * `NativeModules.StepSensor` module. This allows the code to work with both TurboModules and
 * non-TurboModules environments.
 */
const StepSensorModule = isTurboModuleEnabled
  ? require('./NativeStepSensor').default
  : NativeModules.StepSensor;

/**
 * A module that allows you to get the step count data.
 * `CMStepSensor` is deprecated in iOS 8.0. Used `CMPedometer` instead.
 * floorsAscended - The number of floors ascended during the time period. iOS Only.
 * floorsDescended - The number of floors descended during the time period. iOS Only.
 * counterType - The type of counter used to count the steps.
 * @throws {Error} LINKING_ERROR - Throws Error If global variable turboModuleProxy is undefined.
 * @example
 * import { StepSensor } from 'react-native-step-sensor';
 */
const StepSensor = (
  StepSensorModule
    ? StepSensorModule
    : new Proxy(
        {},
        {
          get() {
            throw new Error(LINKING_ERROR);
          },
        }
      )
) as Spec;

const StepEventEmitter = new NativeEventEmitter(StepSensor);
type StepSensorUpdateCallback = (result: StepSensorData) => void;
export const isSensorWorking = () =>
  StepEventEmitter.listenerCount(eventName) > 0;

/**
 * Transform the step sensor data into a more readable format.
 * You can use it or directly use the `StepSensorData` type.
 * @param {StepSensorData} data - Step Sensor Event Data.
 * @returns {ParsedStepSensorData} - String Parsed Count Data.
 */
export function parseStepData(data: StepSensorData): ParsedStepSensorData {
  const { steps, startDate, endDate, distance } = data;
  const dailyGoal = 10000;
  const stepsString = steps + ' steps';
  const kCal = (steps * 0.045).toFixed(2) + 'kCal';
  const endDateTime = new Date(endDate).toLocaleTimeString('ko-KR');
  const startDateTime = new Date(startDate).toLocaleTimeString('ko-KR');
  const endDateStr = new Date(endDate).toLocaleDateString('ko-KR');
  const startDateStr = new Date(startDate).toLocaleDateString('ko-KR');
  const roundedDistance = distance.toFixed(1) + 'm';
  const stepGoalStatus =
    steps >= dailyGoal ? 'Goal Reached' : `${steps}/${dailyGoal} steps`;
  return {
    dailyGoal: stepGoalStatus,
    steps,
    stepsString,
    calories: kCal,
    startDate: startDateTime,
    endDate: endDateTime,
    startDateStr,
    endDateStr,
    startDateFull: new Date(startDate).toISOString(),
    endDateFull: new Date(endDate).toISOString(),
    distance: roundedDistance,
  };
}

/**
 * If you're using a method or property that's not available on the current platform, throw this error.
 * @param {string} moduleName The name of the module.
 * @param {string} propertyName The name of the property.
 * @returns {Error} The error.
 * @example
 *  if (!StepSensor.startStepSensorUpdate) {
 *     throw new UnavailabilityError(NativeModuleName, eventName);
 *  }
 */
class UnavailabilityError extends Error {
  code: string;
  constructor(moduleName: string, propertyName: string) {
    super(
      `The method or property ${moduleName}.${propertyName} is not available on ${Platform.OS}, ` +
        "are you sure you've linked all the native dependencies properly?"
    );
    this.code = 'ERR_UNAVAILABLE';
  }
}

/**
 * Returns whether the StepSensor is enabled on the device.
 * iOS 8.0+ only. Android is available since KitKat (4.4 / API 19).
 * @see https://developer.android.com/about/versions/android-4.4.html
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613963-isstepcountingavailable
 * @returns {Promise<Record<string, boolean>>} A promise that resolves with an object containing the StepSensor availability.
 * supported - Whether the StepSensor is supported on device.
 * granted - Whether user granted the permission.
 */
export function isStepSensorSupported(): Promise<Record<string, boolean>> {
  return StepSensor.isStepSensorSupported();
}

/**
 * Start to subscribe StepSensor updates.
 * Only the past seven days worth of data is stored and available for you to retrieve.
 * Specifying a start date that is more than seven days in the past returns only the available data.
 * ### iOS
 * `CMStepSensor.startStepSensorUpdates` is deprecated since iOS 8.0. so used `CMPedometer.startUpdates` instead.
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613950-startupdates
 * @see https://developer.apple.com/documentation/coremotion/cmStepSensor/1616151-startstepcountingupdates
 * @param {Date} start A date indicating the start of the range over which to measure steps.
 * @param {StepSensorUpdateCallback} callBack - This callback function makes it easy for app developers to receive sensor events.
 * @returns {Subscription} - Returns a Subscription that enables you to call.
 * When you would like to unsubscribe the listener, just use a method of subscriptions's `remove()`.
 * @example
 * const startDate = new Date();
 * startStepSensorUpdate(startDate).then((response) => {
 *    const data = parseStepCountData(response);
 * })
 */
export function startStepSensorUpdate(
  start: Date,
  callBack: StepSensorUpdateCallback
): Subscription {
  if (!StepSensor.startStepSensorUpdate) {
    throw new UnavailabilityError(NAME, eventName);
  }
  const from = start.getTime();
  StepSensor.startStepSensorUpdate(from);
  return StepEventEmitter.addListener(eventName, callBack);
}

/**
 * Stop the step sensor updates.
 * ### iOS
 * `CMStepSensor.stopStepSensorUpdates` is deprecated since iOS 8.0. so used `CMPedometer.stopUpdates` instead.
 * @see https://developer.apple.com/documentation/coremotion/cmpedometer/1613973-stopupdates
 * @see https://developer.apple.com/documentation/coremotion/cmStepSensor/1616157-stopstepcountingupdates
 */
export function stopStepSensorUpdate(): void {
  StepEventEmitter.removeAllListeners(eventName);
  StepSensor.stopStepSensorUpdate();
}

export { NAME, VERSION };
export default StepSensor;
