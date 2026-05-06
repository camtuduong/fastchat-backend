import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceId: { type: String, required: true },
    refreshToken: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    revokeReason: { type: String },
  },
  {
    timestamps: true,
  },
);

//xoa session khi het han hoac khi bi thu hoi (nghiep vu thu hoi session se cap nhat truong revokedAt thay vi xoa session)
sessionSchema.index(
  { userId: 1, deviceId: 1, expiresAt: 1 },
  { expireAfterSeconds: 0 },
  {
    partialFilterExpression: {
      revokedAt: null,
    },
  },
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
