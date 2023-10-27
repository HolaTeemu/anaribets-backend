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
  parseResultsData,
} = require("./utils/gamesUtils");
const {checkBets} = require("./utils/betsUtils");
const {checkHighlightVideo, scheduleHighlightVideoFetching} = require("./utils/highlightUtils");
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

app.use(
  morgan(`:method :url :status :res[content-length] :response-time ms :body`)
);

app.use('/api/users', usersRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/bets', betsRouter);

setInterval(checkBets, 3600000); // Check the bets once per hour


scheduleHighlightVideoFetching();


/* final catch-all route to index.html defined last */
app.get("/*", (req, res) => {
  res.sendFile(__dirname + "/build/index.html");
});


const PORT = process.env.PORT || 3001;
app.listen(PORT);
console.log(`Server running on port ${PORT}`);
