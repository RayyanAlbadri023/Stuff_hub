import mongoose from "mongoose";

// Delete cached model to always use the latest schema
delete (mongoose.models as Record<string, unknown>).Request;

const requestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
    },

    type: {
      type: String,
      enum: ["vacation", "suggestion", "appeal", "resignation"],
      required: true,
    },

    message: {
      type: String,
    },

    // Vacation-specific fields
    start: String,
    end: String,
    days: Number,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Request", requestSchema);
