const usersRouter = require("express").Router();
const User = require("../models/user");

// Get users
usersRouter.get("/", (req, res) => {
  User.find({}).then((result) => {
    return res.json(result);
  });
});

// Check if user exists
usersRouter.get("/exist/:email", (req, res, next) => {
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

// Create new user
usersRouter.post("/", (req, res) => {
  const body = req.body;

  console.log(req);
  console.log(body);

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

// Change username
usersRouter.post("/:userId", (req, res, next) => {
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

// Get player's groups
usersRouter.get("/:userId", (req, res, next) => {
  const id = req.params.userId;

  User.findById(id)
    .then((result) => {
      res.json(result.groups);
    })
    .catch((error) => next(error));
});

module.exports = usersRouter;
