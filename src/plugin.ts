import streamDeck from "@elgato/streamdeck";
import { ActionRegistry } from "./utils/action-registry";

import { PTZControls } from "./actions/ptz-controls";
import { PTZZoom } from "./actions/ptz-zoom";
import { PTZFocus } from "./actions/ptz-focus";
import { PTZTracking, invalidateTrackingFetchCache } from "./actions/ptz-tracking";
import { PTZRegister } from "./actions/ptz-register";
import { PTZSpeed } from "./actions/speed";
import { PTZPreset } from "./actions/preset";
import { Osd } from "./actions/osd";
import { Backlight } from "./actions/backlight";
import { Freeze } from "./actions/freeze";
import { Tally } from "./actions/tally";
import { FocusDial } from "./actions/dials/focus-dials";
import { ZoomDial } from "./actions/dials/zoom-dials";

streamDeck.logger.setLevel("trace");

const ptzControls = new PTZControls();
const ptzTracking = new PTZTracking();
const ptzPreset = new PTZPreset();
const ptzFocus = new PTZFocus();
const ptzZoom = new PTZZoom();
const backlight = new Backlight();
const freeze = new Freeze();
const tally = new Tally();
const osd = new Osd();
const focusDial = new FocusDial();
const zoomDial = new ZoomDial();

streamDeck.actions.registerAction(ptzControls);
streamDeck.actions.registerAction(ptzZoom);
streamDeck.actions.registerAction(ptzFocus);
streamDeck.actions.registerAction(ptzTracking);
streamDeck.actions.registerAction(new PTZSpeed());
streamDeck.actions.registerAction(ptzPreset);
streamDeck.actions.registerAction(osd);
streamDeck.actions.registerAction(backlight);
streamDeck.actions.registerAction(freeze);
streamDeck.actions.registerAction(tally);
streamDeck.actions.registerAction(focusDial);
streamDeck.actions.registerAction(zoomDial);

ActionRegistry.register(ptzControls);
ActionRegistry.register(ptzTracking);
ActionRegistry.register(ptzPreset);
ActionRegistry.register(ptzFocus);
ActionRegistry.register(ptzZoom);
ActionRegistry.register(backlight);
ActionRegistry.register(freeze);
ActionRegistry.register(tally);
ActionRegistry.register(osd);
ActionRegistry.register(focusDial);
ActionRegistry.register(zoomDial);

streamDeck.actions.registerAction(new PTZRegister(ptzTracking));

streamDeck.system.onSystemDidWakeUp(() => invalidateTrackingFetchCache());
streamDeck.devices.onDeviceDidConnect(() => invalidateTrackingFetchCache());

streamDeck.connect();
