const gamesService = require("../services/gamesService");
const User = require("../models/user");
const {
    parseResultsData,
  } = require("../utils/gamesUtils");

// Check bets of the users
const checkBets = async () => {
    console.log("Checking bets...");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.toDateString();
    const yesterdayDateString = yesterday.toISOString().split("T")[0];
  
    const results = await gamesService
      .getResults(yesterdayDateString)
      .then((response) => {
        // return parseResultsData(testidata_results.games);
        return parseResultsData(response.data.gameWeek[0].games === 0 ? testidataResults.games : response.data.gameWeek[0].games);
      })
      .catch((error) =>
        console.log(`Error fetching the results - ${error.message}`)
      );
      
    if (results.length > 0) {
      User.find({}).then((result) => {
        result.forEach((user) => {
          const bets = user.bets;
          let points = 0;
          let totalBets = user.totalBets;
          let betsAfterDeletion = user.bets;
          bets.forEach((game, i) => {
            const result = results.find((result) => result.gameId === game.game);
            if (result) {
              if (result.winner === game.bet) {
                points++;
              }
              totalBets++;
              betsAfterDeletion = betsAfterDeletion.filter(
                (bet) => bet.game !== result.gameId
              );
            }
          });
          User.findOneAndUpdate(
            { _id: user._id },
            {
              points: user.points + points,
              bets: betsAfterDeletion,
              totalBets: totalBets,
            },
            { new: true }
          )
            .then((updatedUser) => {
              // console.log("Bets checked and points granted...");
            })
            .catch((error) => console.log(error.message));
          // console.log("Bets checked but there was no points to grant");
        });
      });
    }
  };
  
  // eslint-disable-next-line import/no-anonymous-default-export
  module.exports = {
    checkBets
  };
  