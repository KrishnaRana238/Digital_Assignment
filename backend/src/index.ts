import { mkdir } from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { z } from "zod";
import {
  requireActiveSubscription,
  requireAdmin,
  requireAuth,
  signSession,
  type AuthenticatedRequest,
} from "./auth.js";
import { ensureStore } from "./store.js";
import {
  activateSubscription,
  addScoreForUser,
  cancelSubscription,
  createBillingPortalLink,
  createCampaign,
  createCharity,
  createIndependentDonation,
  deleteCampaign,
  deleteCharity,
  getAdminDashboard,
  getMemberDashboard,
  getPublicCharities,
  getPublicDraws,
  getPublicOverview,
  handleStripeWebhook,
  loginUser,
  publishDraw,
  registerUser,
  reviewWinner,
  simulateDraw,
  submitWinnerProof,
  updateCampaign,
  updateCharity,
  updateCharityPreferences,
  updateMemberProfile,
  updateScoreForUser,
  updateScoreFromAdmin,
  updateUserFromAdmin,
} from "./services.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const uploadsDirectory = path.join(process.cwd(), "uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_, __, callback) => {
      await mkdir(uploadsDirectory, { recursive: true });
      callback(null, uploadsDirectory);
    },
    filename: (_, file, callback) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]+/g, "-");
      callback(null, `${Date.now()}-${safeName}`);
    },
  }),
});

function route(
  handler: (request: express.Request, response: express.Response) => Promise<void> | void,
) {
  return (request: express.Request, response: express.Response) => {
    Promise.resolve(handler(request, response)).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unexpected server error.";
      response.status(400).json({ error: message });
    });
  };
}

app.use(
  cors({
    origin: frontendUrl,
  }),
);

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  route(async (request, response) => {
    const signature = z.string().parse(request.headers["stripe-signature"]);
    const body = Buffer.isBuffer(request.body)
      ? request.body
      : Buffer.from(String(request.body ?? ""));

    response.json(await handleStripeWebhook(body, signature));
  }),
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDirectory));

app.get(
  "/api/health",
  route(async (_request, response) => {
    response.json({ ok: true });
  }),
);

app.get(
  "/api/public/overview",
  route(async (_request, response) => {
    response.json(await getPublicOverview());
  }),
);

app.get(
  "/api/public/charities",
  route(async (_request, response) => {
    response.json(await getPublicCharities());
  }),
);

app.get(
  "/api/public/draws",
  route(async (_request, response) => {
    response.json(await getPublicDraws());
  }),
);

app.post(
  "/api/public/donations",
  route(async (request, response) => {
    response.status(201).json(await createIndependentDonation(request.body));
  }),
);

app.post(
  "/api/auth/signup",
  route(async (request, response) => {
    const user = await registerUser(request.body);
    const token = await signSession({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    response.status(201).json({ token, user });
  }),
);

app.post(
  "/api/auth/login",
  route(async (request, response) => {
    const user = await loginUser(request.body);
    const token = await signSession({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    response.json({ token, user });
  }),
);

app.get(
  "/api/me/dashboard",
  requireAuth,
  route(async (request, response) => {
    response.json(await getMemberDashboard((request as AuthenticatedRequest).session.sub));
  }),
);

app.post(
  "/api/me/scores",
  requireAuth,
  requireActiveSubscription,
  route(async (request, response) => {
    response.status(201).json(
      await addScoreForUser((request as AuthenticatedRequest).session.sub, request.body),
    );
  }),
);

app.patch(
  "/api/me/scores/:id",
  requireAuth,
  requireActiveSubscription,
  route(async (request, response) => {
    response.json(
      await updateScoreForUser(
        (request as AuthenticatedRequest).session.sub,
        request.params.id,
        request.body,
      ),
    );
  }),
);

app.patch(
  "/api/me/profile",
  requireAuth,
  route(async (request, response) => {
    response.json(
      await updateMemberProfile((request as AuthenticatedRequest).session.sub, request.body),
    );
  }),
);

app.patch(
  "/api/me/charity",
  requireAuth,
  route(async (request, response) => {
    response.json(
      await updateCharityPreferences((request as AuthenticatedRequest).session.sub, request.body),
    );
  }),
);

app.post(
  "/api/me/subscription/activate",
  requireAuth,
  route(async (request, response) => {
    response.json(
      await activateSubscription((request as AuthenticatedRequest).session.sub, request.body),
    );
  }),
);

app.post(
  "/api/me/subscription/cancel",
  requireAuth,
  route(async (request, response) => {
    response.json(await cancelSubscription((request as AuthenticatedRequest).session.sub));
  }),
);

app.post(
  "/api/me/subscription/portal",
  requireAuth,
  route(async (request, response) => {
    response.json(await createBillingPortalLink((request as AuthenticatedRequest).session.sub));
  }),
);

app.post(
  "/api/me/winner-proofs",
  requireAuth,
  upload.single("proof"),
  route(async (request, response) => {
    const winnerId = z.string().parse(request.body.winnerId);
    const file = request.file;

    if (!file) {
      throw new Error("Please upload a screenshot or image file.");
    }

    const publicUrl = `${request.protocol}://${request.get("host")}/uploads/${file.filename}`;
    response.status(201).json(
      await submitWinnerProof(
        (request as AuthenticatedRequest).session.sub,
        winnerId,
        publicUrl,
      ),
    );
  }),
);

app.get(
  "/api/admin/dashboard",
  requireAuth,
  requireAdmin,
  route(async (_request, response) => {
    response.json(await getAdminDashboard());
  }),
);

app.post(
  "/api/admin/draws/simulate",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    const mode = z.enum(["random", "algorithmic"]).parse(request.body.mode);
    response.json(await simulateDraw(mode));
  }),
);

app.post(
  "/api/admin/draws/publish",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    const drawId = z.string().parse(request.body.drawId);
    response.json(await publishDraw(drawId));
  }),
);

app.post(
  "/api/admin/charities",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.status(201).json(await createCharity(request.body));
  }),
);

app.patch(
  "/api/admin/charities/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await updateCharity(request.params.id, request.body));
  }),
);

app.delete(
  "/api/admin/charities/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await deleteCharity(request.params.id));
  }),
);

app.post(
  "/api/admin/campaigns",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.status(201).json(await createCampaign(request.body));
  }),
);

app.patch(
  "/api/admin/campaigns/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await updateCampaign(request.params.id, request.body));
  }),
);

app.delete(
  "/api/admin/campaigns/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await deleteCampaign(request.params.id));
  }),
);

app.patch(
  "/api/admin/users/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await updateUserFromAdmin(request.params.id, request.body));
  }),
);

app.patch(
  "/api/admin/scores/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await updateScoreFromAdmin(request.params.id, request.body));
  }),
);

app.patch(
  "/api/admin/winners/:id",
  requireAuth,
  requireAdmin,
  route(async (request, response) => {
    response.json(await reviewWinner(request.params.id, request.body));
  }),
);

await ensureStore();

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
