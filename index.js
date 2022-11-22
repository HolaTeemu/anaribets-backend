require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const gamesService = require("./services/gamesService");
const Group = require("./models/groups");
const User = require("./models/users");
const {
  parseUpcomingGamesData,
  parseResultsData,
  parseOngoingGamesData,
} = require("./helpers/gamesHelpers");
const {
  parseLeaderboardData,
  parseUserData,
} = require("./helpers/leaderboardHelpers");
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

app.use(
  morgan(`:method :url :status :res[content-length] :response-time ms :body`)
);

// Get results of last nights games
app.get("/api/results", (req, res) => {
  gamesService
    .getResults()
    .then((response) => {
      const data = parseResultsData(response.data.games);
      res.json(data);
    })
    .catch((error) =>
      console.log(`Error fetching the results - ${error.message}`)
    );
});

// Get upcoming games
app.get("/api/upcoming", (req, res) => {
  const startDate = new Date().toISOString().split("T")[0];
  gamesService
    .getUpcomingGames(startDate)
    .then((response) => {
      const data = parseUpcomingGamesData(response.data[0].games);
      res.json(data);
    })
    .catch((error) => {
      console.log(`Error fetching the upcoming games - ${error.message}`);
    });
});

// Get ongoing games
app.get("/api/ongoing", (req, res) => {
  const startDate = new Date().toISOString().split("T")[0];
  gamesService
    .getUpcomingGames(startDate)
    .then((response) => {
      const liveGames = response.data[0].games.filter(
        (game) => game.status.state === "LIVE"
      );
      const data = parseOngoingGamesData(liveGames);
      res.json(data);
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
      return res.json(bets);
    }
    res.json(bets);
  });
});

// Check bets of the users
const checkBets = async () => {
  console.log("Checking bets...");

  const results = await gamesService
    .getResults()
    .then((response) => {
      return parseResultsData(response.data.games);
    })
    .catch((error) =>
      console.log(`Error fetching the results - ${error.message}`)
    );

  User.find({}).then((result) => {
    result.forEach((user) => {
      const bets = user.bets;
      let points = 0;
      let betsAfterDeletion = user.bets;
      bets.forEach((game, i) => {
        const result = results.find((result) => result.gameId === game.game);
        if (result) {
          if (result.winner === game.bet) {
            points++;
          }
          betsAfterDeletion = betsAfterDeletion.filter(
            (bet) => bet.game !== result.gameId
          );
        }
      });
      if (points !== 0) {
        User.findOneAndUpdate(
          { _id: user._id },
          { points: user.points + points, bets: betsAfterDeletion },
          { new: true }
        )
          .then((updatedUser) => {
            // console.log("Bets checked and points granted...");
          })
          .catch((error) => console.log(error.message));
      }
      // console.log("Bets checked but there was no points to grant");
    });
  });
};

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

setInterval(checkBets, 3600000); // Check the bets once per hour

/* final catch-all route to index.html defined last */
app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
