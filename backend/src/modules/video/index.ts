
import { Router } from "express";
import { requireAuth } from "../../auth/auth.middleware";
import { VideoController } from "./video.controller";
import { getIceServers } from "../../realtime/iceConfig";

const router = Router();

// Place fixed paths BEFORE dynamic params to avoid route capture
router.get("/ice-config", requireAuth, async (_req, res) => {
  const iceServers = await getIceServers();
  res.json({ iceServers });
});

router.get(
  "/:courseId",
  requireAuth,
  VideoController.getVideosByCourse,
);

router.get(
  "/:videoId/url",
  requireAuth,
  VideoController.getSignedUrlForVideo,
);

router.get(
  "/:videoId/compression-status",
  requireAuth,
  VideoController.getVideoCompressionStatus,
);

export const videoRoutes = router;