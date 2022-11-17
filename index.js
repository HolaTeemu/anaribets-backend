require("dotenv").config();
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
const { parseLeaderboardData } = require("./helpers/leaderboardHelpers");
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

// app.post("/api/bets/:user", (req, res) => {
//   const body = req.body;

//   if (body.betsList === undefined) {
//     return res.status(400).json({ error: "Content missing"});
//   }

//   console.log(body.betsList[0]);

//   const bet = new Bets({
//     user: req.params.user.toLowerCase(),
//     bets: body.betsList
//   });

//   bet.save().then(savedBets => {
//     res.json(savedBets);
//   })
// })

// app.get("/api/bets/:user", (req, res) => {

//   Bets.find({user: req.params.user}).then(bets => {
//     if (bets.length === 0) {
//       return res.json({bets: []});
//     }
//     res.json(bets[0]);
//   })
// })

// Create new user
app.post("/api/users", (req, res) => {
  const body = req.body;

  if (body.username === undefined) {
    return res.status(400).json({ error: "Username is missing" });
  }

  const user = new User({
    username: body.username.toLowerCase(),
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

// Add users bets
app.post("/api/users/bets/:user", (req, res, next) => {
  const body = req.body;

  if (body.bets === undefined) {
    return res.status(400).json({ error: "Bets are missing" });
  }

  User.findOneAndUpdate(
    { username: req.params.user },
    { $push: { bets: { $each: body.bets } } },
    { new: true }
  )
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((error) => next(error));
});

// Get user bets
app.get("/api/users/bets/:user", (req, res) => {
  User.find({ username: req.params.user }).then((user) => {
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
      // console.log(
      //   `${user.username} had ${user.points} points but got ${points} points last night`
      // );
      if (points !== 0) {
        User.findOneAndUpdate(
          { username: user.username },
          { points: user.points + points, bets: betsAfterDeletion },
          { new: true }
        )
          .then((updatedUser) => {
            console.log("Bets checked and points granted...");
          })
          .catch((error) => console.log(error.message));
      }
      console.log("Bets checked but there was no points to grant");
    });
  });
};

// Get player's groups
app.get("/api/users/:username", (req, res, next) => {
  User.find({ username: req.params.username })
    .then((result) => {
      res.json(result[0].groups);
    })
    .catch((error) => next(error));
});

// Add player to the group
app.post("/api/groups/:groupname", (req, res, next) => {
  const body = req.body;

  if (body.password === undefined) {
    return res.status(400).json({ error: "Password is missing" });
  }

  User.findOne({ username: body.username }).then((result) => {
    if (!result[0].groups.find((group) => group === groupname)) {
      Group.findOneAndUpdate(
        { groupname: req.params.groupname, password: body.password },
        { $push: { players: result[0]._id } },
        { new: true }
      )
        .then((updatedGroup) => {
          console.log(updatedGroup);
          User.findOneAndUpdate(
            { username: body.username },
            { $push: { groups: updatedGroup._id } },
            { new: true }
          )
            .then((updatedUser) => {
              console.log(updatedUser);
            })
            .catch((error) => console.log(error.message));
        })
        .catch((error) => console.log(error.message));
    }
  });
});

// Get group leaderboard
app.get("/api/groups/:groupid", (req, res, next) => {
  const id = req.params.groupid;
  Group.findById(id)
    .then((result) => {
      const groupname = result.groupname;
      User.find({ _id: { $in: result.players } })
        .then((result) => {
          const data = parseLeaderboardData(result);
          res.json({groupname, players: data});
      });
    })
    .catch((error) => next(error));
});

setInterval(checkBets, 3600000); // Check the bets once per hour

/* final catch-all route to index.html defined last */
app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
