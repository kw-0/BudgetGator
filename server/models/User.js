const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isPrimaryUser: { type: Boolean, required: true },

  plaidItemIds: { type: [String], default: [] },
  plaidAccessTokens: { type: [String], default: [] },

  benefactor: {type: [String], required: false},

  monthlyGoals: [
    {
      period: { type: String, required: true }, // YYYY-MM format
      amount: { type: Number, required: true }, // Goal spending limit
    },
  ],
});

module.exports = mongoose.model("User", UserSchema);
