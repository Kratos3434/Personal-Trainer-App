const express = require('express');
require('dotenv').config();
const HTTP_PORT = process.env.PORT || 8080;

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello from lambda");
});

app.listen(HTTP_PORT, () => console.log(`Express server listening on port ${HTTP_PORT}`));

module.exports = app;