const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const groupsSchema = new mongoose.Schema({
  groupname: String,
  password: String,
  admin: mongoose.Schema.Types.ObjectId,
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

groupsSchema.pre("save", function (next) {
  const group = this;

  if (this.isModified("password") || this.isNew) {
    bcrypt.genSalt(10, function (saltError, salt) {
      if (saltError) {
        return next(saltError)
      } else {
        bcrypt.hash(group.password, salt, function(hashError, hash) {
          if (hashError) {
            return next(hashError)
          }
          // console.log(hash);
          group.password = hash
          next()
        })
      }
    })
  } else {
    return next()
  }
})

groupsSchema.methods.comparePassword = (password, groupPassword, callback) => {
  bcrypt.compare(password, groupPassword, function(error, isMatch) {
    if (error) {
      return callback(error)
    } else {
      callback(null, isMatch)
    }
  })
}


module.exports = mongoose.model("group", groupsSchema);
