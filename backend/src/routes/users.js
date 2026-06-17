const router = require('express').Router();
const { listUsers, createUser, updateUser, deleteUser, getStats } = require('../controllers/userController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth, adminOnly);
router.get('/stats', getStats);
router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
