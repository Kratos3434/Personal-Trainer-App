const prisma = require("../prismaInstance");
const { Request, Response } = require("express");
const Video = require("./Video");

class Exercise {
  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async create(req, res) {
    // name, typeId, intensity, defaultSets, defaultReps(optional), minutes(optional), levelId, requiredEquipmentId
    const {
      name,
      typeId,
      intensity,
      defaultSets,
      defaultReps,
      minutes,
      levelId,
      requiredEquipmentId,
    } = req.body;
    try {
      if (!name) throw "Name is required";
      if (!typeId === undefined) throw "TypeId is required";
      if (!intensity === undefined) throw "Intensity is required";
      //if (!+intensity) throw "Intensity must be a valid number";
      if (!defaultSets === undefined) throw "Default sets is required";
      //if (!+defaultSets) throw "Default sets must be a valid number";
      if (!defaultReps === null && !minutes === undefined)
        throw "Either Default reps or minutes is required";
      //if (!+defaultReps) throw "Default reps must be a valid number";
      if (!levelId === undefined) throw "Level id is required";
      //if (!+levelId) throw "Level id must be a valid number";
      if (!requiredEquipmentId === undefined) throw "Equipment id is required";
      //if (!+requiredEquipmentId) throw "Equipment id must be a valid number";

      const exercise = await prisma.exercise.findFirst({
        where: {
          name,
        },
      });

      if (exercise) throw "Exercise name already exists";

      const newExercise = await prisma.exercise.create({
        data: {
          name,
          typeId: +typeId,
          intensity: +intensity,
          defaultSets: +defaultSets,
          defaultReps: +defaultReps,
          minutes: +minutes,
          levelId: +levelId,
          requiredEquipmentId: +requiredEquipmentId,
        },
      });

      //Generate the video data
      const videos = await Video.getVideosFromYoutubeByExerciseName(newExercise.name, true);
      //console.log(videos);

      //If Youtube reaches its quota, delete the previously created exercises
      if (!videos) {
        await prisma.exercise.delete({
          where: {
            id: newExercise.id,
          },
        });

        throw "Youtube API has reached it's quota, exercise cannot be created";
      }

      videos.map(async (e) => {
        //Create many videos
        await prisma.video.create({
          data: {
            url: `https://www.youtube.com/watch?v=${e.id.videoId}`,
            title: e.snippet.title,
            thumbnail: e.snippet.thumbnails.default.url,
            exerciseId: newExercise.id,
          },
        });
      });

      res
        .status(200)
        .json({ status: true, data: newExercise, message: "Exercise successfully created" });
    } catch (err) {
      console.log(err);
      res.status(400).json({ status: false, error: err });
    }
  }

  /**
   *
   * @param {Request} req
   * @param {Response} res
   */
  static async list(req, res) {
    try {
      const exercises = await prisma.exercise.findMany({});

      res.status(200).json({ status: true, data: exercises, message: "List" });
    } catch (err) {
      res.status(400).json({ status: false, error: err });
    }
  }
}

module.exports = Exercise;
