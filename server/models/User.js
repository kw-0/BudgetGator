const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isPrimaryUser: { type: Boolean, required: true },


  plaidAccessToken: { type: String, default: null },
  plaidItemId: { type: String, default: null },
  plaidLinkToken:  { type: String, default: null },

});

module.exports = mongoose.model("User", UserSchema);
