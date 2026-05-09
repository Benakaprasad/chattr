import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text:     { type: String, required: true },
  sentAt:   { type: Date,   default: Date.now }
});

export default mongoose.model("Message", messageSchema);