require("dotenv").config();
const gamesService = require("../services/gamesService");
const Result = require("../models/result");
const {
    parseResultsData,
  } = require("../utils/gamesUtils");
const YOUTUBE_API_KEY = process.env.API_KEY_YT;
const YTSearch = require("youtube-api-search");


const checkHighlightVideo = () => {
    console.log("Trying to fetch highlight videos...");
    gamesService
      .getResults()
      .then((response) => {
        if (response.data.games.length > 0) {
          //const data = parseResultsData(testidata_results.games); // testidata
          const data = parseResultsData(response.data.games.length === 0 ? testidataResults.games : response.data.games);
  
          data.forEach((game) => {
            const month = new Date(game.startTime).toLocaleString("default", {
              month: "long",
            });
            const date = new Date(game.startTime).getDate() - 1;
            const year = new Date(game.startTime).getFullYear();
  
            const searchTerm = `NHL Highlights | ${game.awayTeamName} vs. ${game.homeTeamName} - ${month} ${date}, ${year}`;
  
            Result.findOne({ gameId: game.gameId, highlightReel: "" })
              .then((result) => {
                if (result) {
                  YTSearch(
                    { key: YOUTUBE_API_KEY, term: searchTerm },
                    (videos) => {
                      const video = videos[0];
                      if (video.snippet.title === searchTerm) {
                        const highlightReelLink = `https://www.youtube.com/watch?v=${video.id.videoId}`;
                        Result.findOneAndUpdate(
                          { gameId: result.gameId, highlightReel: "" },
                          { highlightReel: highlightReelLink },
                          { new: true }
                        )
                          .then((updatedResult) => {
                            //console.log(updatedResult);
                          })
                          .catch((error) => {
                            console.log(error);
                          });
                      }
                    }
                  );
                }
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
    if (currentHour < 10 || (currentHour === 10 && currentMinutes < 00)) {
      const targetTime = new Date(now);
      targetTime.setHours(10, 00, 0, 0);
      timeUntil9AM = targetTime - now;
      console.log(timeUntil9AM);
    } else {
      const nextDay = new Date(now);
      nextDay.setDate(nextDay.getDate() + 1);
      nextDay.setHours(10, 00, 0, 0);
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
    scheduleHighlightVideoFetching
  };
  