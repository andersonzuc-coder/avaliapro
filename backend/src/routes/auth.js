const router = require('express').Router();
const { login, register, me, changePassword } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/login', login);
router.post('/register', register);
router.get('/me', auth, me);
router.put('/change-password', auth, changePassword);

module.exports = router;
