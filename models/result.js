const mongoose = require("mongoose");

const resultsSchema = new mongoose.Schema({
  gameId: Number,
  result: String,
  homeAbbr: String,
  awayAbbr: String,
  bets: Array,
  highlightReel: String,
});

resultsSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

module.exports = mongoose.model("results", resultsSchema);
