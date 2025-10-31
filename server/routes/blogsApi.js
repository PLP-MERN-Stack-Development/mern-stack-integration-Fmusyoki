// API base URL (no trailing slash)
const API_BASE_URL = 'http://localhost:5000/blogs/';
import express from "express"
const router = express.Router();

// Helper for handling responses
const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMsg = 'Something went wrong';
    try {
      const error = await response.json();
      errorMsg = error.message || errorMsg;
    } catch {
      // fallback if response isn't JSON
      const text = await response.text();
      console.error('Non-JSON error:', text);
    }
    throw new Error(errorMsg);
  }
  return response.json();
};

// Blog API
const blogAPI = {
  // ✅ Get all blogs
  getBlogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}?${queryString}`);
    return handleResponse(response);
  },

  // ✅ Get single blog by ID
  getBlog: async (id) => {
    const response = await fetch(`${API_BASE_URL}/${id}`);
    return handleResponse(response);
  },

  // ✅ Create new blog
  createBlog: async (blogData) => {
    const response = await fetch(`${API_BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  // ✅ Update blog
  updateBlog: async (id, blogData) => {
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  // ✅ Add reaction to blog
  addReaction: async (blogId, reactionType) => {
    const response = await fetch(`${API_BASE_URL}/${blogId}/reactions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionType }),
    });
    return handleResponse(response);
  },

  // ✅ Add comment to blog
  addComment: async (blogId, commentData) => {
    const response = await fetch(`${API_BASE_URL}/${blogId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData),
    });
    return handleResponse(response);
  },

  // ✅ Add reaction to a specific comment
  addCommentReaction: async (blogId, commentId, reactionType) => {
    const response = await fetch(`${API_BASE_URL}/${blogId}/comments/${commentId}/reactions`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionType }),
    });
    return handleResponse(response);
  },
};

export default router;
