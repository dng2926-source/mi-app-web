const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: {
    type: String,
    required: function () {
      return !this.firebaseUid;
    },
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now, index: true },
});

// Índices para búsqueda y sorting
UserSchema.index({ username: "text" });
UserSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", UserSchema);
