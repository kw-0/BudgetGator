const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },

  //plaidItemId: { type: String, default: null },
  plaidAccessTokens: { type: [String], default: [] },


});

module.exports = mongoose.model("User", UserSchema);