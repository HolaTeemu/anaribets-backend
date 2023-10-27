const gamesRouter = require("express").Router();
const Result = require("../models/result");
const gamesService = require("../services/gamesService");
const {
  parseUpcomingGamesData,
  parseResultsData,
  parseOngoingGamesData,
} = require("../utils/gamesUtils");

// Get results of last nights games
gamesRouter.get("/results", (req, res) => {
  gamesService
    .getResults()
    .then((response) => {
      if (response.data.length === 0) {
        //const data = parseResultsData(testidata_results.games); // testidata
        //res.json(data); // testidata
        res.json(testidataResults ? testidataResults.games : response.data);
      } else {
        const data = parseResultsData(
          response.data.games.length === 0
            ? testidataResults.games
            : response.data.games
        ); // testidata
        //const data = parseResultsData(response.data.games);
        data.forEach((game) => {
          Result.findOneAndUpdate(
            { gameId: game.gameId, result: "" },
            { result: game.winner },
            { new: true }
          ).then((updatedResult) => {
            // console.log(updatedResult);
          });
        });
        res.json(data);
      }
    })
    .catch((error) =>
      console.log(`Error fetching the results - ${error.message}`)
    );
});

// Get upcoming games
gamesRouter.get("/upcoming", (req, res) => {
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  gamesService
    .getUpcomingGames(startDate)
    .then((response) => {
      if (response.data.length === 0) {
        //const data = parseUpcomingGamesData(testidata_upcoming[0].games); // testidata
        //res.json(data); //testidata
        res.json(
          testidataUpcoming
            ? parseUpcomingGamesData(testidataUpcoming[0].games)
            : response.data
        );
      } else {
        //const data = parseUpcomingGamesData(testidata_upcoming[0].games); // testidata
        const data = parseUpcomingGamesData(
          response.data[0].games.length === 0
            ? testidataUpcoming[0].games
            : response.data[0].games
        );

        data.forEach((game) => {
          const result = new Result({
            gameId: game.gameId,
            result: "",
            bets: [],
            highlightReel: ""
          });

          Result.findOne({ gameId: game.gameId }).then((res) => {
            if (!res) {
              result
                .save()
                .then((savedResult) => {
                  // console.log(savedResult);
                })
                .catch((error) => next(error));
            }
          });
        });
        res.json(data);
      }
    })
    .catch((error) => {
      console.log(`Error fetching the upcoming games - ${error.message}`);
    });
});

// Get ongoing games
gamesRouter.get("/ongoing", (req, res) => {
  const yesterday = new Date();
  const tomorrow = new Date();

  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.toDateString();

  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.toDateString();

  const startDate = yesterday.toISOString().split("T")[0];
  const endDate = tomorrow.toISOString().split("T")[0];

  gamesService
    .getUpcomingGames(endDate, startDate)
    .then((response) => {
      if (response.data.length === 0) {
        // const data = parseOngoingGamesData(testidata_ongoing); // testidata
        // res.json(data); //testidata
        res.json(
          testidataOngoing
            ? parseOngoingGamesData(testidataOngoing)
            : response.data
        );
      } else {
        // const data = parseOngoingGamesData(testidata_ongoing); // testidata
        const data = parseOngoingGamesData(
          response.data[0].games.length === 0 ? testidataOngoing : response.data
        );
        res.json(data);
      }
    })
    .catch((error) => {
      console.log(`Error fetching the ongoing games - ${error.message}`);
    });
});

module.exports = gamesRouter;
