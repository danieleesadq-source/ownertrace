import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import searchRouter from "./search.js";
import entityRouter from "./entity.js";
import entitiesRouter from "./entities.js";
import patternsRouter from "./patterns.js";
import importRouter from "./import.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(entityRouter);
router.use(entitiesRouter);
router.use(patternsRouter);
router.use(importRouter);

export default router;
