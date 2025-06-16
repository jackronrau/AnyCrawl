import express, { Router, ErrorRequestHandler } from "express";
import { ScrapeController } from "../../controllers/v1/ScrapeController.js";
import { SearchController } from "../../controllers/v1/SearchController.js";
import { controllerWrapper } from "../../utils/AsyncHandler.js";

const router: express.Router = Router();
const scrapeController = new ScrapeController();
const searchController = new SearchController();

router.post("/scrape", controllerWrapper(scrapeController.handle));
router.post("/search", controllerWrapper(searchController.handle));

export default router;
