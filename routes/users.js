const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
});

router.get("/protected", (req, res) => {
  res.send('Protected Route!')
});

module.exports = router;