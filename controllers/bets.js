const betsRouter = require("express").Router();
const User = require("../models/user");
const Result = require("../models/result");
const Group = require("../models/group");

// Add users bets
betsRouter.post("/:userId", (req, res, next) => {
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
betsRouter.get("/:userId", (req, res) => {
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
betsRouter.get("/amounts/:userId", (req, res) => {
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
          let obj = {
            gameId: result.gameId,
            [result.homeAbbr]: 0,
            [result.awayAbbr]: 0,
          };

          result.bets.forEach((bet) => {
            if (bet.bet === result.homeAbbr) {
              obj[result.homeAbbr] += 1;
            } else {
              obj[result.awayAbbr] += 1;
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

// Get user's bets from last night
betsRouter.post("/results/:userId", (req, res, next) => {
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

// Get lists of last night's bets (for the results page name list)
betsRouter.post("/grouplist/:userId", (req, res, next) => {
  const gameId = req.body.gameId;
  const id = req.params.userId;
  const groupObjects = []; // List of objects with groupname, players and what their bets were
  let playerList = [];

  User.findById(id)
    .then((result) => {
      const groups = result.groups;
      Result.find({ gameId: gameId }).then((gameResult) => {
        //const userBet = gameResult[0].bets.find(r => r.playerId === id);
        Group.find({ _id: { $in: groups } }).then((result) => {
          result.forEach((group) => {
            group.players.forEach((player) => {
              if (gameResult[0]) {
                const playerBet = gameResult[0].bets.find(
                  (r) => r.playerId === player._id.toString()
                );
                if (playerBet) {
                  playerList.push({
                    user: player._id.toString(),
                    bet: playerBet.bet,
                  });
                }
              }
            });
            groupObjects.push({
              groupName: group.groupname,
              players: playerList,
            });
            playerList = [];
          });
          res.json(groupObjects);
        });
      });
    })
    .catch((error) => next(error));
});
module.exports = betsRouter;
