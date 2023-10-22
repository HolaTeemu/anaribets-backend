const mongoose = require("mongoose");

const url = process.env.MONGODB_URI;

mongoose
  .connect(url)
  .then((result) => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB - ", error.message);
  });

const usersSchema = new mongoose.Schema({
  username: String,
  email: String,
  groups: Array,
  bets: Array,
  points: Number,
  totalBets: Number,
});

usersSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

module.exports = mongoose.model("user", usersSchema);
