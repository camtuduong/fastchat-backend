import mongoose from "mongoose";

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
    avatarUrl: { type: String, trim: true }, // Link CDN avatar hien thi hinh
    avatarId: { type: String, trim: true }, // Cloudinary ID de xoa avatar cu
    bio: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
  },
);
const User = mongoose.model("User", userSchema);
export default User;
