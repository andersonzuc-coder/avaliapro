const router = require('express').Router();
const { uploadPdf: uploadPdfHandler, listPdfs, getPdf, deletePdf } = require('../controllers/pdfController');
const { auth } = require('../middleware/auth');
const { uploadPdf } = require('../middleware/upload');

router.use(auth);
router.post('/upload', uploadPdf.single('pdf'), uploadPdfHandler);
router.get('/', listPdfs);
router.get('/:id', getPdf);
router.delete('/:id', deletePdf);

module.exports = router;
