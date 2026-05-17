import mongoose from "mongoose";

const vacationSchema = new mongoose.Schema({
  user: String,
  name: String,
  start: String,
  end: String,
  days: Number,
  status: String,
});

export default mongoose.models.Vacation ||
  mongoose.model("Vacation", vacationSchema);