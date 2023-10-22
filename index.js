require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const gamesService = require("./services/gamesService");
const Group = require("./models/group");
const User = require("./models/user");
const Result = require("./models/result");
const {
  parseUpcomingGamesData,
  parseResultsData,
  parseOngoingGamesData,
} = require("./helpers/gamesHelpers");
const YOUTUBE_API_KEY = process.env.API_KEY_YT;
const YTSearch = require("youtube-api-search");
const usersRouter = require("./controllers/users");
const groupsRouter = require("./controllers/groups");
const gamesRouter = require("./controllers/games");
const betsRouter = require("./controllers/bets");
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static("build"));

morgan.token("body", (req, res) => {
  if (req.method === "POST") {
    return JSON.stringify(req.body);
  }
  return;
});

const testidataUpcoming = process.env.ENV = "TEST" ? require("./testidata_upcoming.json") : null;
const testidataOngoing = process.env.ENV = "TEST" ? require("./testidata_ongoing.json") : null;
const testidataResults = process.env.ENV = "TEST" ? require("./testidata_results.json") : null;


//const testidata_upcoming = require("./testidata_upcoming.json"); // testidata
// const testidata_ongoing = require("./testidata_ongoing.json"); // testidata
//const testidata_results = require("./testidata_results.json"); // testidata

app.use(
  morgan(`:method :url :status :res[content-length] :response-time ms :body`)
);

app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/bets', betsRouter);

// Check bets of the users
const checkBets = async () => {
  console.log("Checking bets...");

  const results = await gamesService
    .getResults()
    .then((response) => {
      // return parseResultsData(testidata_results.games);
      return parseResultsData(response.data.games.length === 0 ? testidataResults.games : response.data.games);
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


const checkHighlightVideo = () => {
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
                          // console.log(updatedResult);
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

setInterval(checkBets, 3600000); // Check the bets once per hour

let now = new Date();
let millisUntilNineAM =
  new Date(now.getFullYear(), now.getMonth(), now.getDate(), 09, 00, 0, 0) -
  now;
millisUntilNineAM < 0 &&
  (millisUntilNineAM =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      07,
      00,
      0,
      0
    ) - now);
setTimeout(() => {
  setInterval(checkHighlightVideo, 86400000); // Check the highlight reels once per two hour
}, millisUntilNineAM);

/* final catch-all route to index.html defined last */
app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});


const PORT = process.env.PORT || 3001;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
