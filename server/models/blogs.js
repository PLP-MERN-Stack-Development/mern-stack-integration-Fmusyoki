import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    lineNumber: {
      type: Number,
      default: null,
    },
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
    },
    reactions: {
      like: { type: Number, default: 0 },
      dislike: { type: Number, default: 0 },
      heart: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      confused: { type: Number, default: 0 },
      eyes: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

const fileSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
    default: "javascript",
  },
  content: {
    type: String,
    required: true,
  },
});

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    files: [fileSchema],
    comments: [commentSchema],
    reactions: {
      like: { type: Number, default: 0 },
      dislike: { type: Number, default: 0 },
      heart: { type: Number, default: 0 },
      laugh: { type: Number, default: 0 },
      confused: { type: Number, default: 0 },
      eyes: { type: Number, default: 0 },
    },
    tags: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Virtual for formatted date
blogSchema.virtual("formattedDate").get(function () {
  return this.createdAt.toISOString().split("T")[0];
});

// Indexes for performance
blogSchema.index({ status: 1, createdAt: -1 });
blogSchema.index({ author: 1 });

const Blog = mongoose.model("Blog", blogSchema);

export default Blog; // 👈 crucial line
