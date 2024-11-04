const express = require('express');
require('dotenv').config();
const HTTP_PORT = process.env.PORT || 8080;

const userRouter = require('./routes/user');
const otpRouter = require('./routes/otp');
const measurementRouter = require('./routes/measurement');
const routineRouter = require('./routes/routine');
const currentRoutineRouter = require('./routes/currentRoutine')
const progressRouter = require('./routes/progress')
const videoRouter = require('./routes/video');
const exerciseRouter = require('./routes/exercise');
const workoutEnvironmentJunctionRouter = require('./routes/workoutEnvironmentJunction');
const muscleGroupJunction = require('./routes/muscleGroupJunction');
const polling = require('./routes/polling');

const app = express();

app.use(express.json());

app.use("/user", userRouter);
app.use("/otp", otpRouter);
app.use("/measurement", measurementRouter);
app.use("/routine", routineRouter);
app.use("/progress", progressRouter);
app.use("/currentRoutine", currentRoutineRouter);
app.use("/video", videoRouter);
app.use("/exercise", exerciseRouter);
app.use("/workoutEnvironmentJunction", workoutEnvironmentJunctionRouter);
app.use("/muscleGroupJunction", muscleGroupJunction);
app.use("/polling", polling);

app.listen(HTTP_PORT, () => console.log(`Express server listening on port ${HTTP_PORT}`));

module.exports = app;