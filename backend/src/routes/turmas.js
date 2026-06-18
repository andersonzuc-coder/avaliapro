const router = require('express').Router();
const { auth } = require('../middleware/auth');
const {
  listTurmas, createTurma, deleteTurma,
  listAlunos, addAluno, bulkAddAlunos, deleteAluno,
} = require('../controllers/turmaController');

router.get('/',                     auth, listTurmas);
router.post('/',                    auth, createTurma);
router.delete('/:id',               auth, deleteTurma);
router.get('/:id/alunos',           auth, listAlunos);
router.post('/:id/alunos',          auth, addAluno);
router.post('/:id/alunos/bulk',     auth, bulkAddAlunos);
router.delete('/alunos/:id',        auth, deleteAluno);

module.exports = router;
