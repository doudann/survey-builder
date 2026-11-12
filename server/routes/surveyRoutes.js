const express = require('express');
const {
  createSurvey,
  getMySurveys,
  getSurvey,
  updateSurvey,
  deleteSurvey,
  getSurveyResults,
} = require('../controllers/surveyController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').post(createSurvey).get(getMySurveys);
router.get('/:id/results', getSurveyResults);
router.route('/:id').get(getSurvey).put(updateSurvey).delete(deleteSurvey);

module.exports = router;