import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    userId: { type: String, required: true },
    eta: { type: String, required: true },
    items: [{ type: String }],
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const returnRequestSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    reason: { type: String, required: true },
    instructions: {
      type: String,
      default:
        "Please pack the item securely. Our courier will pick it up within 48 hours.",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
export const Order = mongoose.model("Order", orderSchema);
export const ReturnRequest = mongoose.model(
  "ReturnRequest",
  returnRequestSchema
);
