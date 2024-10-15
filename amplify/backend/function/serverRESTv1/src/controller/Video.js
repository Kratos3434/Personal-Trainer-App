const prisma = require('../prismaInstance');
const { Request, Response } = require('express');

class Video {
    /**
     * 
     * @param {string} name 
     * @returns for internal use only
     */
    static async getVideosFromYoutubeByExerciseName(name) {
        try {
            if (!name) throw "Name is required";
            const maxResults = 10;
            const videoDuration = "short";

            const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(name)}&videoDuration=${videoDuration}&order=viewCount&maxResults=${maxResults}&key=${process.env.YOUTUBE_API_KEY}`);
            const data = await res.json();

            return data.items;
        } catch (err) {
            if (err) throw err;
            throw "Error fetching youtube videos";
        }
    }

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     */
    static async getByExerciseIdRandom(req, res) {
        const { exerciseId } = req.params;
        try {
            if (exerciseId === undefined) throw "Id is missing";

            const videos = await prisma.video.findMany({
                where: {
                    exerciseId: +exerciseId
                }
            });

            const index = Math.floor(Math.random() * videos.length); // Changed to videos.length to prevent error when videos are less than 10

            res.status(200).json({status: true, data: videos[index]});
        } catch (err) {
            res.status(400).json({status: false, error: err});
        }
    }
}

module.exports = Video;