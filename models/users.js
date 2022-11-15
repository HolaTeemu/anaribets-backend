const mongoose = require("mongoose");

const url = process.env.MONGODB_URI;

const usersSchema = new mongoose.Schema({
  userName: String,
  groups: Array,
  bets: Array,
  points: Number
});

usersSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model("users", usersSchema);