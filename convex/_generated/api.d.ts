/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai_getAI from "../ai/getAI.js";
import type * as aiTextGeneration from "../aiTextGeneration.js";
import type * as duelIntroduction from "../duelIntroduction.js";
import type * as duels from "../duels.js";
import type * as generateImage from "../generateImage.js";
import type * as generateRoundIllustration from "../generateRoundIllustration.js";
import type * as generateWizardIllustration from "../generateWizardIllustration.js";
import type * as mocks_mockServices from "../mocks/mockServices.js";
import type * as processDuelRound from "../processDuelRound.js";
import type * as test_utils from "../test_utils.js";
import type * as wizards from "../wizards.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/getAI": typeof ai_getAI;
  aiTextGeneration: typeof aiTextGeneration;
  duelIntroduction: typeof duelIntroduction;
  duels: typeof duels;
  generateImage: typeof generateImage;
  generateRoundIllustration: typeof generateRoundIllustration;
  generateWizardIllustration: typeof generateWizardIllustration;
  "mocks/mockServices": typeof mocks_mockServices;
  processDuelRound: typeof processDuelRound;
  test_utils: typeof test_utils;
  wizards: typeof wizards;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
