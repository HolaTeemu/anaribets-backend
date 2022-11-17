const mongoose = require("mongoose");

const groupsSchema = new mongoose.Schema({
  groupname: String,
  password: String,
  players: Array,
});

groupsSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString();
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.password;
  },
});

module.exports = mongoose.model("groups", groupsSchema);
