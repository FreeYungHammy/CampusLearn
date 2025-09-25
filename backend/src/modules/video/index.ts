
import { Router } from "express";
import { requireAuth } from "../../auth/auth.middleware";
import { VideoController } from "./video.controller";

const router = Router();

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

export const videoRoutes = router;
