import { Router } from 'express';
import express from 'express';
import { ScrapeController } from '../controllers/v1/ScrapeController';
import { controllerWrapper } from '../utils/AsyncHandler';

const router: express.Router = Router();
const scrapeController = new ScrapeController();

// Add express.json() middleware to parse JSON bodies
router.use(express.json());

router.post('/scrape', controllerWrapper(scrapeController.handle));

export default router;
