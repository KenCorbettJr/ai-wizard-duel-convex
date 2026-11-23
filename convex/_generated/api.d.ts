/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as accountDeletion from "../accountDeletion.js";
import type * as admin from "../admin.js";
import type * as adminUsers from "../adminUsers.js";
import type * as ai_getAI from "../ai/getAI.js";
import type * as aiTextGeneration from "../aiTextGeneration.js";
import type * as aiUsage from "../aiUsage.js";
import type * as campaignAI from "../campaignAI.js";
import type * as campaignOpponentAI from "../campaignOpponentAI.js";
import type * as campaignOpponents from "../campaignOpponents.js";
import type * as campaignSeasons from "../campaignSeasons.js";
import type * as campaigns from "../campaigns.js";
import type * as crons from "../crons.js";
import type * as duelChat from "../duelChat.js";
import type * as duelIntroduction from "../duelIntroduction.js";
import type * as duelLobby from "../duelLobby.js";
import type * as duelRatings from "../duelRatings.js";
import type * as duelRatingsData from "../duelRatingsData.js";
import type * as duelViews from "../duelViews.js";
import type * as duels from "../duels.js";
import type * as generateImage from "../generateImage.js";
import type * as generateImageWithGemini from "../generateImageWithGemini.js";
import type * as generateRoundIllustration from "../generateRoundIllustration.js";
import type * as generateWizardIllustration from "../generateWizardIllustration.js";
import type * as http from "../http.js";
import type * as imageCompressionService from "../imageCompressionService.js";
import type * as imageCreditService from "../imageCreditService.js";
import type * as imageGenerationConfig from "../imageGenerationConfig.js";
import type * as lib_aiPricing from "../lib/aiPricing.js";
import type * as lib_bflImage from "../lib/bflImage.js";
import type * as lib_contentStandards from "../lib/contentStandards.js";
import type * as lib_departed from "../lib/departed.js";
import type * as lib_duelChat from "../lib/duelChat.js";
import type * as lib_duelParticipants from "../lib/duelParticipants.js";
import type * as lib_duelRating from "../lib/duelRating.js";
import type * as lib_duelTokens from "../lib/duelTokens.js";
import type * as lib_imageProvider from "../lib/imageProvider.js";
import type * as lib_narrationScript from "../lib/narrationScript.js";
import type * as lib_narrationValidator from "../lib/narrationValidator.js";
import type * as lib_portrait from "../lib/portrait.js";
import type * as lib_posthog from "../lib/posthog.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_recordAIUsage from "../lib/recordAIUsage.js";
import type * as lib_referenceImageRules from "../lib/referenceImageRules.js";
import type * as lib_scheduleDuelRating from "../lib/scheduleDuelRating.js";
import type * as lib_scheduleNarration from "../lib/scheduleNarration.js";
import type * as lib_spellReactions from "../lib/spellReactions.js";
import type * as lib_watcherRules from "../lib/watcherRules.js";
import type * as lib_wizardImageTokens from "../lib/wizardImageTokens.js";
import type * as lib_wizardStats from "../lib/wizardStats.js";
import type * as metadata from "../metadata.js";
import type * as mocks_mockServices from "../mocks/mockServices.js";
import type * as moderationEvents from "../moderationEvents.js";
import type * as narration from "../narration.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as presence from "../presence.js";
import type * as processDuelRound from "../processDuelRound.js";
import type * as promoteUser from "../promoteUser.js";
import type * as pushDelivery from "../pushDelivery.js";
import type * as referrals from "../referrals.js";
import type * as roundMedia from "../roundMedia.js";
import type * as seasonHelpers from "../seasonHelpers.js";
import type * as sessionService from "../sessionService.js";
import type * as spellIdeas from "../spellIdeas.js";
import type * as spellIdeasData from "../spellIdeasData.js";
import type * as spellReactions from "../spellReactions.js";
import type * as stripe from "../stripe.js";
import type * as subscriptionService from "../subscriptionService.js";
import type * as testGeminiIntegration from "../testGeminiIntegration.js";
import type * as test_utils from "../test_utils.js";
import type * as types from "../types.js";
import type * as usageLimiterService from "../usageLimiterService.js";
import type * as userProfileUtils from "../userProfileUtils.js";
import type * as userProfiles from "../userProfiles.js";
import type * as userSubscriptionQueries from "../userSubscriptionQueries.js";
import type * as users from "../users.js";
import type * as watcher from "../watcher.js";
import type * as wizards from "../wizards.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  accountDeletion: typeof accountDeletion;
  admin: typeof admin;
  adminUsers: typeof adminUsers;
  "ai/getAI": typeof ai_getAI;
  aiTextGeneration: typeof aiTextGeneration;
  aiUsage: typeof aiUsage;
  campaignAI: typeof campaignAI;
  campaignOpponentAI: typeof campaignOpponentAI;
  campaignOpponents: typeof campaignOpponents;
  campaignSeasons: typeof campaignSeasons;
  campaigns: typeof campaigns;
  crons: typeof crons;
  duelChat: typeof duelChat;
  duelIntroduction: typeof duelIntroduction;
  duelLobby: typeof duelLobby;
  duelRatings: typeof duelRatings;
  duelRatingsData: typeof duelRatingsData;
  duelViews: typeof duelViews;
  duels: typeof duels;
  generateImage: typeof generateImage;
  generateImageWithGemini: typeof generateImageWithGemini;
  generateRoundIllustration: typeof generateRoundIllustration;
  generateWizardIllustration: typeof generateWizardIllustration;
  http: typeof http;
  imageCompressionService: typeof imageCompressionService;
  imageCreditService: typeof imageCreditService;
  imageGenerationConfig: typeof imageGenerationConfig;
  "lib/aiPricing": typeof lib_aiPricing;
  "lib/bflImage": typeof lib_bflImage;
  "lib/contentStandards": typeof lib_contentStandards;
  "lib/departed": typeof lib_departed;
  "lib/duelChat": typeof lib_duelChat;
  "lib/duelParticipants": typeof lib_duelParticipants;
  "lib/duelRating": typeof lib_duelRating;
  "lib/duelTokens": typeof lib_duelTokens;
  "lib/imageProvider": typeof lib_imageProvider;
  "lib/narrationScript": typeof lib_narrationScript;
  "lib/narrationValidator": typeof lib_narrationValidator;
  "lib/portrait": typeof lib_portrait;
  "lib/posthog": typeof lib_posthog;
  "lib/pricing": typeof lib_pricing;
  "lib/recordAIUsage": typeof lib_recordAIUsage;
  "lib/referenceImageRules": typeof lib_referenceImageRules;
  "lib/scheduleDuelRating": typeof lib_scheduleDuelRating;
  "lib/scheduleNarration": typeof lib_scheduleNarration;
  "lib/spellReactions": typeof lib_spellReactions;
  "lib/watcherRules": typeof lib_watcherRules;
  "lib/wizardImageTokens": typeof lib_wizardImageTokens;
  "lib/wizardStats": typeof lib_wizardStats;
  metadata: typeof metadata;
  "mocks/mockServices": typeof mocks_mockServices;
  moderationEvents: typeof moderationEvents;
  narration: typeof narration;
  notifications: typeof notifications;
  payments: typeof payments;
  presence: typeof presence;
  processDuelRound: typeof processDuelRound;
  promoteUser: typeof promoteUser;
  pushDelivery: typeof pushDelivery;
  referrals: typeof referrals;
  roundMedia: typeof roundMedia;
  seasonHelpers: typeof seasonHelpers;
  sessionService: typeof sessionService;
  spellIdeas: typeof spellIdeas;
  spellIdeasData: typeof spellIdeasData;
  spellReactions: typeof spellReactions;
  stripe: typeof stripe;
  subscriptionService: typeof subscriptionService;
  testGeminiIntegration: typeof testGeminiIntegration;
  test_utils: typeof test_utils;
  types: typeof types;
  usageLimiterService: typeof usageLimiterService;
  userProfileUtils: typeof userProfileUtils;
  userProfiles: typeof userProfiles;
  userSubscriptionQueries: typeof userSubscriptionQueries;
  users: typeof users;
  watcher: typeof watcher;
  wizards: typeof wizards;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  presence: import("@convex-dev/presence/_generated/component.js").ComponentApi<"presence">;
};
