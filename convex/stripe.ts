"use node";

import Stripe from "stripe";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { getTokenPack } from "./lib/pricing";

/**
 * Stripe Checkout for token packs.
 *
 * Convex environment variables (npx convex env set NAME value):
 *   STRIPE_SECRET_KEY      sk_test_... / sk_live_...
 *   STRIPE_WEBHOOK_SECRET  whsec_... for the endpoint
 *                          https://<deployment>.convex.site/stripe/webhook
 *   SITE_URL               e.g. https://ai-wizard-duel.com (no trailing slash)
 */

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(key);
}

function getSiteUrl(): string {
  const url = process.env.SITE_URL;
  if (!url) {
    throw new Error("SITE_URL is not set");
  }
  return url.replace(/\/$/, "");
}

/** Start a Stripe Checkout for a token pack. Returns the URL to redirect to. */
export const createTokenCheckout = action({
  args: { packId: v.string() },
  returns: v.object({ url: v.string() }),
  handler: async (ctx, { packId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const pack = getTokenPack(packId);
    if (!pack) {
      throw new Error("Unknown token pack");
    }

    const siteUrl = getSiteUrl();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceCents,
            product_data: {
              name: `${pack.name}: ${pack.tokens} tokens`,
              description: `${pack.tokens} AI Wizard Duel tokens. One token enters one duel. Tokens never expire.`,
            },
          },
        },
      ],
      client_reference_id: identity.subject,
      customer_email: identity.email ?? undefined,
      metadata: {
        clerkId: identity.subject,
        packId: pack.id,
        tokens: String(pack.tokens),
      },
      success_url: `${siteUrl}/credits?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/credits?purchase=cancelled`,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    await ctx.runMutation(internal.payments.recordPendingPurchase, {
      userId: identity.subject,
      packId: pack.id,
      tokens: pack.tokens,
      amountCents: pack.priceCents,
      currency: "usd",
      stripeSessionId: session.id,
    });

    return { url: session.url };
  },
});

/**
 * Verify and handle a Stripe webhook. Called by the HTTP route in http.ts.
 * Returns false when the signature is invalid.
 */
export const handleStripeWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { payload, signature }) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (error) {
      console.error("Invalid Stripe webhook signature", error);
      return false;
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      // Delayed payment methods complete first and pay later
      if (session.payment_status !== "paid") {
        return true;
      }
      const result = await ctx.runMutation(internal.payments.completePurchase, {
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id,
        amountPaidCents: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
      });
      console.log(`Stripe session ${session.id}: ${result}`);
    }

    return true;
  },
});
