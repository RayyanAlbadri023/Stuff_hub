import mongoose, { Schema } from "mongoose";

// Force clear cached model so new fields (resetToken, resetTokenExpiry) always apply
delete (mongoose.models as Record<string, unknown>).User;

const userSchema = new Schema(
  {
    firstName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["employee", "admin"],
      default: "employee",
    },
    resetToken: { type: String, default: null },
    resetTokenExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
