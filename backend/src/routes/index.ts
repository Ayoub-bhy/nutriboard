import { Router } from 'express';
import * as c from '../controllers/index.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler as h } from '../utils/http.js';
import phase1 from './phase1.routes.js';

const router = Router();

// Public auth routes
router.post('/auth/register', h(c.register));
router.post('/auth/login', h(c.login));

// Everything below requires a valid JWT
router.use(requireAuth);

router.get('/auth/me', h(c.me));

router.get('/profile', h(c.getProfile));
router.patch('/profile', h(c.updateProfile));

router.get('/meals', h(c.listMeals));
router.post('/meals', h(c.addMeal));
router.delete('/meals/:id', h(c.deleteMeal));

router.get('/water', h(c.getWater));
router.put('/water', h(c.setWater));

router.get('/weights', h(c.listWeights));
router.post('/weights', h(c.logWeight));

router.get('/habits', h(c.listHabits));
router.post('/habits', h(c.addHabit));
router.delete('/habits/:id', h(c.removeHabit));
router.put('/habits/:id/log', h(c.setHabitLog));

router.get('/suggestions', h(c.getSuggestions));

router.get('/coach', h(c.coachHistory));
router.post('/coach', h(c.coachChat));

router.get('/history', h(c.listChanges));

// Phase 1: onboarding, streaks, food search
router.use(phase1);

export default router;
