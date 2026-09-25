const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'DevArena API is running smoothly.' });
});

module.exports = router;
