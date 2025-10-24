/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adService from "../adService.js";
import type * as ai_getAI from "../ai/getAI.js";
import type * as aiTextGeneration from "../aiTextGeneration.js";
import type * as campaignAI from "../campaignAI.js";
import type * as campaignOpponents from "../campaignOpponents.js";
import type * as campaigns from "../campaigns.js";
import type * as duelIntroduction from "../duelIntroduction.js";
import type * as duelLobby from "../duelLobby.js";
import type * as duels from "../duels.js";
import type * as generateImage from "../generateImage.js";
import type * as generateImageWithGemini from "../generateImageWithGemini.js";
import type * as generateRoundIllustration from "../generateRoundIllustration.js";
import type * as generateWizardIllustration from "../generateWizardIllustration.js";
import type * as imageCreditService from "../imageCreditService.js";
import type * as imageGenerationConfig from "../imageGenerationConfig.js";
import type * as metadata from "../metadata.js";
import type * as mocks_mockServices from "../mocks/mockServices.js";
import type * as processDuelRound from "../processDuelRound.js";
import type * as sessionService from "../sessionService.js";
import type * as subscriptionService from "../subscriptionService.js";
import type * as testGeminiIntegration from "../testGeminiIntegration.js";
import type * as test_utils from "../test_utils.js";
import type * as types from "../types.js";
import type * as usageLimiterService from "../usageLimiterService.js";
import type * as userProfileUtils from "../userProfileUtils.js";
import type * as userProfiles from "../userProfiles.js";
import type * as userSubscriptionQueries from "../userSubscriptionQueries.js";
import type * as users from "../users.js";
import type * as wizards from "../wizards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adService: typeof adService;
  "ai/getAI": typeof ai_getAI;
  aiTextGeneration: typeof aiTextGeneration;
  campaignAI: typeof campaignAI;
  campaignOpponents: typeof campaignOpponents;
  campaigns: typeof campaigns;
  duelIntroduction: typeof duelIntroduction;
  duelLobby: typeof duelLobby;
  duels: typeof duels;
  generateImage: typeof generateImage;
  generateImageWithGemini: typeof generateImageWithGemini;
  generateRoundIllustration: typeof generateRoundIllustration;
  generateWizardIllustration: typeof generateWizardIllustration;
  imageCreditService: typeof imageCreditService;
  imageGenerationConfig: typeof imageGenerationConfig;
  metadata: typeof metadata;
  "mocks/mockServices": typeof mocks_mockServices;
  processDuelRound: typeof processDuelRound;
  sessionService: typeof sessionService;
  subscriptionService: typeof subscriptionService;
  testGeminiIntegration: typeof testGeminiIntegration;
  test_utils: typeof test_utils;
  types: typeof types;
  usageLimiterService: typeof usageLimiterService;
  userProfileUtils: typeof userProfileUtils;
  userProfiles: typeof userProfiles;
  userSubscriptionQueries: typeof userSubscriptionQueries;
  users: typeof users;
  wizards: typeof wizards;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
