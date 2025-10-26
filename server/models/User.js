const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isPrimaryUser: { type: Boolean, required: true },

  plaidItemId: { type: String, default: null },
  plaidLinkToken:  { type: String, default: null },

});

module.exports = mongoose.model("User", UserSchema);
const User = mongoose.model("User", userSchema);
export default User;
