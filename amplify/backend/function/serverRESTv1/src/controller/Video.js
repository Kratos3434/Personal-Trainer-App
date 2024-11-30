const prisma = require("../prismaInstance");
const { Request, Response } = require("express");
const Fuse = require("fuse.js");

class Video {
  /**
   *
   * @param {string} name
   * @returns for internal use only
   */
  static async getVideosFromYoutubeByExerciseName(name, useNewKey = false) {
    try {
      if (!name) throw "Name is required";
      const maxResults = 30;
      const videoDuration = "short";

      const apiKey = useNewKey ? process.env.NEW_YOUTUBE_API_KEY : process.env.YOUTUBE_API_KEY;

      if (!apiKey) throw "API key is missing";

      // Step 1: Fetch videos by relevance (100pts per search)
      const query = `How to ${name}`;
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&videoDuration=${videoDuration}&order=relevance&maxResults=${maxResults}&key=${apiKey}`,
      );
      const data = await res.json();

      // Step 2: Create an instance of Fuse.js to perform fuzzy search on titles and descriptions
      const options = {
        includeScore: true,
        threshold: 0.3, // sensitivity
        keys: ["snippet.title", "snippet.description"],
      };

      const fuse = new Fuse(data.items, options);
      const results = fuse.search(name);
      const filteredVideos = results.map((result) => result.item);

      // Step 3: Fetch statistics (viewCount) for the each videos (1pt per video)
      const videoIds = filteredVideos.map((video) => video.id.videoId).join(",");
      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${apiKey}`,
      );
      const statsData = await statsRes.json();

      // Step 4: Merge the statistics into the video objects
      const videosWithStats = filteredVideos.map((video) => {
        const stats = statsData.items.find((stat) => stat.id === video.id.videoId);
        return {
          ...video,
          statistics: stats ? stats.statistics : null,
        };
      });

      // Step 5: Sort filtered videos by viewCount
      const sortedVideos = videosWithStats.sort((a, b) => {
        const aViews = a.statistics ? parseInt(a.statistics.viewCount, 10) : 0;
        const bViews = b.statistics ? parseInt(b.statistics.viewCount, 10) : 0;
        return bViews - aViews;
      });

      console.log(sortedVideos);

      // Step 6: Get only the top 10 most popular videos
      return sortedVideos.slice(0, 10);
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
    // Accept both http req or object
    const isHttpRequest = req && req.params !== undefined;
    const { exerciseId } = isHttpRequest ? req.params : req;
    try {
      if (exerciseId === undefined) throw "Id is missing";

      const videos = await prisma.video.findMany({
        where: {
          exerciseId: +exerciseId,
        },
      });

      const index = Math.floor(Math.random() * videos.length); // Changed to videos.length to prevent error when videos are less than 10

      return isHttpRequest
        ? res.status(200).json({ status: true, data: videos[index] })
        : { data: videos[index] };
    } catch (err) {
      return isHttpRequest
        ? res.status(400).json({ status: false, error: err })
        : { status: false, error: err };
    }
  }
}

module.exports = Video;
