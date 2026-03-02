import { Router } from "express";
import { analyticsRouter } from "./analytics.js";
import { authRouter } from "./auth.js";
import { exercisesRouter } from "./exercises.js";
import { groupsRouter } from "./groups.js";
import { leaderboardRouter } from "./leaderboard.js";
import { meRouter } from "./me.js";
import { sessionsRouter } from "./sessions.js";
import { setlogsRouter } from "./setlogs.js";
import { templateExercisesRouter } from "./template-exercises.js";
import { templatesRouter } from "./templates.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/templates", templatesRouter);
apiRouter.use("/sessions", sessionsRouter);
apiRouter.use("/setlogs", setlogsRouter);
apiRouter.use("/exercises", exercisesRouter);
apiRouter.use("/template-exercises", templateExercisesRouter);
apiRouter.use("/groups", groupsRouter);
apiRouter.use("/leaderboard", leaderboardRouter);
apiRouter.use("/analytics", analyticsRouter);
