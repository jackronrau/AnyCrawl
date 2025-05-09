import { Router } from 'express';
import express from 'express';
import { ScrapeController } from '../controllers/v1/ScrapeController';
import { SearchController } from '../controllers/v1/SearchController';
import { controllerWrapper } from '../utils/AsyncHandler';

const router: express.Router = Router();
const scrapeController = new ScrapeController();
const searchController = new SearchController();
// Add express.json() middleware to parse JSON bodies
router.use(express.json());

router.post('/scrape', controllerWrapper(scrapeController.handle));
router.post('/search', controllerWrapper(searchController.handle));

export default router;
