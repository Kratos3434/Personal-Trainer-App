const express = require('express');
require('dotenv').config();
const HTTP_PORT = process.env.PORT || 8080;
const sampleRouter = require('./routes/sample');
const userRouter = require('./routes/user');

const app = express();

app.use(express.json());

app.use("/sample", sampleRouter);
app.use("/user", userRouter);

app.listen(HTTP_PORT, () => console.log(`Express server listening on port ${HTTP_PORT}`));

module.exports = app;