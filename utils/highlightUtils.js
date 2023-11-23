require("dotenv").config();
const gamesService = require("../services/gamesService");
const Result = require("../models/result");
const { parseResultsData } = require("../utils/gamesUtils");
const YOUTUBE_API_KEY = process.env.API_KEY_YT;
const YTSearch = require("youtube-api-search");
const teams = require("../teams.json");

const checkHighlightVideo = () => {
  console.log("Trying to fetch highlight videos...");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.toDateString();
  const yesterdayDateString = yesterday.toISOString().split("T")[0];
  gamesService
    .getResults(yesterdayDateString)
    .then((response) => {
      if (response && response.data.gameWeek[0].games.length > 0) {
        //const data = parseResultsData(testidata_results.games); // testidata
        //const data = parseResultsData(response.data.games.length === 0 ? testidataResults.games : response.data.games);
        const data = parseResultsData(response.data.gameWeek[0].games);

        data.forEach((game) => {
          const month = new Date(game.startTime).toLocaleString("default", {
            month: "long",
          });
          const highlightReelLink = `https://www.nhl.com${game.highlightVideo}`;

          Result.findOneAndUpdate(
            { gameId: game.gameId, highlightReel: "" },
            { highlightReel: highlightReelLink },
            { new: true }
          )
            .then((updatedResult) => {
              console.log(updatedResult);
            })
            .catch((error) => {
              console.log(error);
            });
        });
      }
    })
    .catch((error) =>
      console.log(`Error fetching the results - ${error.message}`)
    );
};

function scheduleHighlightVideoFetching() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  // Calculate the time until 9 AM
  let timeUntil9AM;
  if (currentHour < 9 || (currentHour === 9 && currentMinutes < 0)) {
    const targetTime = new Date(now);
    targetTime.setHours(9, 0, 0, 0);
    timeUntil9AM = targetTime - now;
    console.log(timeUntil9AM);
  } else {
    const nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(9, 0, 0, 0);
    timeUntil9AM = nextDay - now;
    console.log(timeUntil9AM);
  }

  // Schedule the first execution
  setTimeout(function () {
    checkHighlightVideo();

    // Schedule subsequent executions every two hours (7,200,000 milliseconds)
    setInterval(checkHighlightVideo, 2 * 60 * 60 * 1000);
  }, timeUntil9AM);
}

// eslint-disable-next-line import/no-anonymous-default-export
module.exports = {
  checkHighlightVideo,
  scheduleHighlightVideoFetching,
};
