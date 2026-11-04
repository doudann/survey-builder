const express = require('express');
const {
  getPublicSurvey,
  submitResponse,
} = require('../controllers/publicSurveyController');

const router = express.Router();

router.get('/:shareId', getPublicSurvey);
router.post('/:shareId/responses', submitResponse);

module.exports = router;
