const prisma = require("../prismaInstance");
const { Request, Response } = require("express");

class WorkoutEnvironmentJunction {
  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async create(req, res) {
    const { exerciseId, workoutEnvironmentId } = req.body;
    try {
      if (exerciseId === undefined) throw "Exercise id is required";
      if (workoutEnvironmentId === undefined) throw "Workout environment id is required";

      const exercise = await prisma.exercise.findUnique({
        where: {
          id: +exerciseId,
        },
      });

      if (!exercise) throw "Exercise does not exist";

      const workoutEnvironment = await prisma.workoutEnvironment.findUnique({
        where: {
          id: +workoutEnvironmentId,
        },
      });

      if (!workoutEnvironment) throw "Workout environment does not exist";

      await prisma.workoutEnvironmentJunction.create({
        data: {
          exerciseId: exercise.id,
          workoutEnvironmentId: workoutEnvironment.id,
        },
      });

      res.status(200).json({ status: true, message: "Success" });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }
}

module.exports = WorkoutEnvironmentJunction;
