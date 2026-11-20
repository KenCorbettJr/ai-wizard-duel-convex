import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Stripe sends checkout events here. Configure the endpoint in the Stripe
// dashboard as https://<deployment>.convex.site/stripe/webhook
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    const payload = await request.text();
    const ok = await ctx.runAction(internal.stripe.handleStripeWebhook, {
      payload,
      signature,
    });

    return ok
      ? new Response(null, { status: 200 })
      : new Response("Invalid signature", { status: 400 });
  }),
});

export default http;
