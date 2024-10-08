const express = require('express');
require('dotenv').config();
const HTTP_PORT = process.env.PORT || 8080;
const userRouter = require('./routes/user');
const otpRouter = require('./routes/otp');
const measurementRouter = require('./routes/measurement');
const routineRouter = require('./routes/routine');
const currentRoutineRouter = require('./routes/currentRoutine')

const app = express();

app.use(express.json());

app.use("/user", userRouter);
app.use("/otp", otpRouter);
app.use("/measurement", measurementRouter);
app.use("/routine", routineRouter);
app.use("/currentRoutine", currentRoutineRouter);

app.listen(HTTP_PORT, () => console.log(`Express server listening on port ${HTTP_PORT}`));

module.exports = app;