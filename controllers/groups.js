const groupsRouter = require("express").Router();
const Group = require("../models/group");
const User = require("../models/user");
const { parseLeaderboardData } = require("../helpers/leaderboardHelpers");
const mongoose = require("mongoose");

// Get group leaderboard
groupsRouter.get("/:groupid", (req, res, next) => {
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

// Create new group
groupsRouter.post("/create", (req, res, next) => {
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

// Add player to the group
groupsRouter.post("/join/:groupname", (req, res, next) => {
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

module.exports = groupsRouter;
