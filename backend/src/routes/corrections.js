const router = require('express').Router();
const { correctExam, listCorrections, getCorrection } = require('../controllers/correctionController');
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.use(auth);
router.post('/correct', uploadImage.single('image'), correctExam);
router.get('/', listCorrections);
router.get('/:id', getCorrection);

module.exports = router;
