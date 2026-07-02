import mongoose from "mongoose";
import { normalizeText } from "../utils/normalizeText.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    hashPassword: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    displayName: { type: String, required: true, trim: true },
    displayNameNormalized: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    avatarId: { type: String, trim: true },
    bio: { type: String, maxlength: 500 },
    status: {
      type: String,
      enum: ["online", "offline", "away", "busy"],
      default: "offline",
    },
    lastActiveAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", function (next) {
  if (this.isModified("displayName")) {
    this.displayNameNormalized = normalizeText(this.displayName);
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;
