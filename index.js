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

// Add users bets
app.post("/api/users/bets/:userId", (req, res, next) => {
  const body = req.body;
  const id = req.params.userId;

  if (body.bets === undefined) {
    return res.status(400).json({ error: "Bets are missing" });
  }

  User.findOneAndUpdate(
    { _id: id },
    { $push: { bets: { $each: body.bets } } },
    { new: true }
  )
    .then((updatedUser) => {
      updatedUser.bets.forEach((bet) => {
        Result.findOneAndUpdate(
          { gameId: bet.game, "bets.playerId": { $ne: id } },
          { $push: { bets: { ...bet, playerId: id } } },
          { new: true }
        )
          .then((singleResult) => {
            // console.log(singleResult);
          })
          .catch((error) => next(error));
      });
      res.json(updatedUser);
    })
    .catch((error) => next(error));
});

// Get user bets
app.get("/api/users/bets/:userId", (req, res) => {
  const id = req.params.userId;

  User.find({ _id: id }).then((user) => {
    const bets = user[0].bets;
    if (bets.length === 0) {
      return res.json([]);
    }
    res.json(bets);
  });
});

// Get bet percentages
app.get("/api/bets/amounts/:userId", (req, res) => {
  const id = req.params.userId;

  User.find({ _id: id }).then((user) => {
    const bets = user[0].bets;
    if (bets.length === 0) {
      return res.json([]);
    }

    const gameIds = bets.map((bet) => bet.game);

    Result.find({ gameId: { $in: gameIds } })
      .then((foundResultDocuments) => {
        let betAmounts = [];
        foundResultDocuments.forEach((result) => {
          const homeAbbr = result.gameId.substring(3, 6);
          const awayAbbr = result.gameId.substring(0, 3);
          let obj = {
            gameId: result.gameId,
            [homeAbbr]: 0,
            [awayAbbr]: 0,
          };

          result.bets.forEach((bet) => {
            if (bet.bet === homeAbbr) {
              obj[homeAbbr] += 1;
            } else {
              obj[awayAbbr] += 1;
            }
          });
          betAmounts = [...betAmounts, obj];
        });
        res.json(betAmounts);
      })
      .catch((error) =>
        console.log(`Error fetching the bet amounts - ${error.message}`)
      );
  });
});

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

// Get user's bets from last night
app.post("/api/results/:userId", (req, res, next) => {
  const body = req.body;
  const id = req.params.userId;

  if (body.gameIds === undefined) {
    return res.status(400).json({ error: "Game ids are missing" });
  }

  const gameIds = req.body.gameIds;

  Result.find({ gameId: { $in: gameIds }, result: { $ne: "" } }).then(
    (foundResultDocuments) => {
      Result.find({ "bets.playerId": id })
        .then((foundResults) => {
          let bets = [];
          foundResults.forEach((resDoc) => {
            const foundBet = resDoc.bets.find((el) => el.playerId === id);
            bets = [
              ...bets,
              {
                game: foundBet.game,
                bet: foundBet.bet,
                highlightReel: resDoc.highlightReel,
              },
            ];
          });
          res.json(bets);
        })
        .catch((error) => next(error));
    }
  );
});

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
