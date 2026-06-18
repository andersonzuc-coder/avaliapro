const router = require('express').Router();
const { correctExam, listCorrections, getCorrection, deleteCorrection } = require('../controllers/correctionController');
const { auth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');

router.use(auth);
router.post('/correct', uploadImage.single('image'), correctExam);
router.get('/', listCorrections);
router.get('/:id', getCorrection);
router.delete('/:id', deleteCorrection);

module.exports = router;
