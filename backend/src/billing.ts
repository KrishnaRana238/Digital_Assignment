import Stripe from "stripe";
import type { SubscriptionPlan, SubscriptionStatus } from "./types.js";

let stripeClient: Stripe | null = null;

function getFrontendUrl() {
  return process.env.FRONTEND_URL?.trim() || "http://localhost:3000";
}

function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY?.trim() || "";
}

function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
}

function getMonthlyPriceId() {
  return process.env.STRIPE_MONTHLY_PRICE_ID?.trim() || "";
}

function getYearlyPriceId() {
  return process.env.STRIPE_YEARLY_PRICE_ID?.trim() || "";
}

export function isStripeConfigured() {
  return Boolean(getStripeSecretKey() && getMonthlyPriceId() && getYearlyPriceId());
}

export function isStripeWebhookConfigured() {
  return Boolean(getStripeWebhookSecret());
}

function getStripeClient() {
  if (!isStripeConfigured()) {
    throw new Error(
      "Stripe is not configured. Please set STRIPE_SECRET_KEY, STRIPE_MONTHLY_PRICE_ID, and STRIPE_YEARLY_PRICE_ID.",
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey());
  }

  return stripeClient;
}

export function getPriceIdForPlan(plan: SubscriptionPlan) {
  return plan === "monthly" ? getMonthlyPriceId() : getYearlyPriceId();
}

export function getPlanFromPriceId(priceId: string | null | undefined): SubscriptionPlan | null {
  if (!priceId) {
    return null;
  }

  if (priceId === getMonthlyPriceId()) {
    return "monthly";
  }

  if (priceId === getYearlyPriceId()) {
    return "yearly";
  }

  return null;
}

export async function createCheckoutSession(input: {
  customerId?: string | null;
  email: string;
  userId: string;
  plan: SubscriptionPlan;
}) {
  const stripe = getStripeClient();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: `${getFrontendUrl()}/dashboard?billing=success`,
    cancel_url: `${getFrontendUrl()}/pricing?billing=cancelled`,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    client_reference_id: input.userId,
    customer: input.customerId || undefined,
    customer_email: input.customerId ? undefined : input.email,
    line_items: [
      {
        price: getPriceIdForPlan(input.plan),
        quantity: 1,
      },
    ],
    metadata: {
      userId: input.userId,
      plan: input.plan,
    },
    subscription_data: {
      metadata: {
        userId: input.userId,
        plan: input.plan,
      },
    },
  });
}

export async function createCustomerPortalSession(customerId: string) {
  const stripe = getStripeClient();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${getFrontendUrl()}/dashboard`,
  });
}

export async function retrieveSubscription(subscriptionId: string) {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function retrieveCustomer(customerId: string) {
  const stripe = getStripeClient();
  return stripe.customers.retrieve(customerId);
}

export async function scheduleSubscriptionCancellation(subscriptionId: string) {
  const stripe = getStripeClient();

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function resumeSubscription(subscriptionId: string) {
  const stripe = getStripeClient();

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function createCustomer(input: { email: string; name: string; userId: string }) {
  const stripe = getStripeClient();

  return stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: {
      userId: input.userId,
    },
  });
}

export function constructWebhookEvent(rawBody: Buffer, signature: string) {
  const webhookSecret = getStripeWebhookSecret();

  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured.");
  }

  return getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "unpaid":
    case "incomplete_expired":
      return "lapsed";
    case "paused":
    case "incomplete":
    default:
      return "inactive";
  }
}

export function getRenewalDateFromSubscription(subscription: Stripe.Subscription) {
  const unixTime = subscription.items.data[0]?.current_period_end ?? null;

  if (!unixTime) {
    return null;
  }

  return new Date(unixTime * 1000).toISOString();
}

export function getPlanFromSubscription(subscription: Stripe.Subscription): SubscriptionPlan | null {
  const priceId = subscription.items.data[0]?.price.id;
  return getPlanFromPriceId(priceId);
}

export function getCheckoutModeSummary() {
  return {
    enabled: isStripeConfigured(),
    webhookEnabled: isStripeWebhookConfigured(),
  };
}
