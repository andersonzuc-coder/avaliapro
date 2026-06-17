const router = require('express').Router();
const { generateExam, listExams, getExam, updateExamStatus, deleteExam, updateQuestion, uploadQuestionImage } = require('../controllers/examController');
const { auth } = require('../middleware/auth');
const { uploadQuestionImage: uploadQImg } = require('../middleware/upload');

router.use(auth);
router.post('/generate', generateExam);
router.get('/', listExams);
router.put('/questions/:questionId', updateQuestion);
router.post('/questions/:questionId/image', uploadQImg.single('image'), uploadQuestionImage);
router.get('/:id', getExam);
router.put('/:id/status', updateExamStatus);
router.delete('/:id', deleteExam);

module.exports = router;
