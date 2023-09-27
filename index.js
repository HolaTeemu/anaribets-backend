require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const gamesService = require("./services/gamesService");
const Group = require("./models/groups");
const User = require("./models/users");
const Result = require("./models/results");
const {
  parseUpcomingGamesData,
  parseResultsData,
  parseOngoingGamesData,
} = require("./helpers/gamesHelpers");
const {
  parseLeaderboardData,
  parseUserData,
} = require("./helpers/leaderboardHelpers");
const YOUTUBE_API_KEY = process.env.API_KEY_YT;
const YTSearch = require("youtube-api-search");
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

// Get results of last nights games
app.get("/api/results", (req, res) => {
  gamesService
    .getResults()
    .then((response) => {
      if (response.data.length === 0) {
        //const data = parseResultsData(testidata_results.games); // testidata
        //res.json(data); // testidata
        res.json(testidataResults ? testidataResults.games : response.data);
      } else {
        const data = parseResultsData(response.data.games.length === 0 ? testidataResults.games : response.data.games); // testidata
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
app.get("/api/upcoming", (req, res) => {
  const today = new Date();
  const startDate = today.toISOString().split("T")[0];
  gamesService
    .getUpcomingGames(startDate)
    .then((response) => {
      if (response.data.length === 0) {
        //const data = parseUpcomingGamesData(testidata_upcoming[0].games); // testidata
        //res.json(data); //testidata
        res.json(testidataUpcoming ? parseUpcomingGamesData(testidataUpcoming[0].games) : response.data);
      } else {
        //const data = parseUpcomingGamesData(testidata_upcoming[0].games); // testidata
        const data = parseUpcomingGamesData(response.data[0].games.length === 0 ? testidataUpcoming[0].games : response.data[0].games);

        data.forEach((game) => {
          const result = new Result({
            gameId: game.gameId,
            result: "",
            bets: [],
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
app.get("/api/ongoing", (req, res) => {
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
        res.json(testidataOngoing ? parseOngoingGamesData(testidataOngoing) : response.data);
      } else {
        // const data = parseOngoingGamesData(testidata_ongoing); // testidata
        const data = parseOngoingGamesData(response.data[0].games.length === 0 ? testidataOngoing : response.data);
        res.json(data);
      }
    })
    .catch((error) => {
      console.log(`Error fetching the ongoing games - ${error.message}`);
    });
});

// Create new user
app.post("/api/users", (req, res) => {
  const body = req.body;

  if (body.username === undefined) {
    return res.status(400).json({ error: "Username is missing" });
  }

  if (body.email === undefined) {
    return res.status(400).json({ error: "Email is missing" });
  }

  const user = new User({
    username: body.username.toLowerCase(),
    email: body.email,
    groups: [],
    bets: [],
    points: 0,
    totalBets: 0,
  });

  user.save().then((savedUser) => {
    res.json(savedUser);
  });
});

// Get users
app.get("/api/users", (req, res) => {
  User.find({}).then((result) => {
    return res.json(result);
  });
});

// Check if user exists
app.get("/api/users/exist/:email", (req, res, next) => {
  const email = req.params.email;

  User.find({ email: email })
    .then((result) => {
      if (result.length > 0) {
        return res.json({
          id: result[0]._id,
          username: result[0].username,
        });
      } else {
        return res.json([]);
      }
    })
    .catch((error) => {
      next(error);
    });
});

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

// Get player's groups
app.get("/api/users/:userId", (req, res, next) => {
  const id = req.params.userId;

  User.findById(id)
    .then((result) => {
      res.json(result.groups);
    })
    .catch((error) => next(error));
});

// Add player to the group
app.post("/api/groups/join/:groupname", (req, res, next) => {
  const body = req.body;
  const groupname = req.params.groupname.toLowerCase();

  if (body.userId === undefined) {
    return res.status(400).json({ error: "User id is missing" });
  }

  if (body.password === undefined) {
    return res.status(400).json({ error: "Password is missing" });
  }

  User.findById(body.userId).then((result) => {
    Group.findOne({ groupname: groupname })
      .then((result) => {
        if (result) {
          result.comparePassword(
            body.password,
            result.password,
            (matchError, isMatch) => {
              if (matchError || !isMatch) {
                return res.status(401).json({ error: "Password incorrect" });
              } else {
                const playersObjectId = mongoose.Types.ObjectId(body.userId);
                Group.findOneAndUpdate(
                  { groupname: groupname },
                  { $push: { players: playersObjectId } },
                  { new: true }
                )
                  .then((updatedGroup) => {
                    User.findOneAndUpdate(
                      { _id: body.userId },
                      { $push: { groups: updatedGroup._id } },
                      { new: true }
                    )
                      .then((updatedUser) => {
                        res.json({ groupId: updatedGroup._id });
                      })
                      .catch((error) => console.log(error.message));
                  })
                  .catch((error) => console.log(error.message));
              }
            }
          );
        } else {
          return res.status(404).json({ error: "Group not found" });
        }
      })
      .catch((error) => next(error));
  });
});

// Create new group
app.post("/api/groups/create", (req, res, next) => {
  const body = req.body;
  const id = mongoose.Types.ObjectId(body.userId);

  if (!body.groupname) {
    return res.status(400).json({ error: "Groupname is missing" });
  }

  if (!body.password) {
    return res.status(400).json({ error: "Password is missing" });
  }

  const group = new Group({
    groupname: body.groupname.toLowerCase(),
    password: body.password,
    admin: id,
    players: [id],
  });

  group.save().then((savedGroup) => {
    User.findByIdAndUpdate(
      id,
      { $push: { groups: group._id } },
      { new: true }
    ).then((result) => {
      res.json({ groupId: savedGroup._id });
    });
  });
});

// Get group leaderboard
app.get("/api/groups/:groupid", (req, res, next) => {
  const id = req.params.groupid;
  Group.findById(id)
    .then((result) => {
      const groupname = result.groupname;
      User.find({ _id: { $in: result.players } }).then((result) => {
        const data = parseLeaderboardData(result);
        res.json({ groupname, players: data });
      });
    })
    .catch((error) => next(error));
});

// Change username
app.post("/api/users/:userId", (req, res, next) => {
  const body = req.body;
  const userId = req.params.userId;

  User.findByIdAndUpdate(
    userId,
    { username: body.newUsername },
    { new: true }
  ).then((user) => {
    res.json(user);
  });
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
