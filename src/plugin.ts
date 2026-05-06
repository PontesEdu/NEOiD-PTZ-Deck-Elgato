import streamDeck from "@elgato/streamdeck";

import { PTZControls } from "./actions/ptz-controls";
import { PTZZoom } from "./actions/ptz-zoom";
import { PTZFocus } from "./actions/ptz-focus";
import { PTZTracking } from "./actions/ptz-tracking";
import { PTZRegister } from "./actions/ptz-register";
import { PTZSpeed } from "./actions/speed";
import { PTZPreset } from "./actions/preset";
import { Osd } from "./actions/osd";
import { Backlight } from "./actions/backlight";
import { FocusDial } from "./actions/dials/focus-dials";
import { ZoomDial } from "./actions/dials/zoom-dials";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");


// Register action.
streamDeck.actions.registerAction(new PTZControls());
streamDeck.actions.registerAction(new PTZZoom());
streamDeck.actions.registerAction(new PTZFocus());
streamDeck.actions.registerAction(new PTZTracking());
streamDeck.actions.registerAction(new PTZSpeed());
streamDeck.actions.registerAction(new PTZPreset());
streamDeck.actions.registerAction(new Osd());
streamDeck.actions.registerAction(new Backlight());
streamDeck.actions.registerAction(new PTZRegister(new PTZControls, new PTZTracking, new PTZPreset, new PTZFocus, new PTZZoom, new Backlight, new Osd, new FocusDial, new ZoomDial));

// DIALS
streamDeck.actions.registerAction(new FocusDial());
streamDeck.actions.registerAction(new ZoomDial());
streamDeck.connect();


