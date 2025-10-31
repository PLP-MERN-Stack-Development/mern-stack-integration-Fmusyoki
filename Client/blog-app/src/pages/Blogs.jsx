import React, { useState, useEffect } from 'react';
import Base from "../components/base";

// API base URL - hardcoded for now
const API_BASE_URL = 'http://localhost:5000/api';

// Local storage keys
const LOCAL_STORAGE_KEYS = {
  BLOGS: 'codeBlogs_data',
  CURRENT_BLOG: 'codeBlogs_currentBlog',
  COMMENTS: 'codeBlogs_comments',
  REACTIONS: 'codeBlogs_reactions'
};

// Reaction types
const reactionTypes = [
  { id: 'like', emoji: '👍', label: 'Like' },
  { id: 'dislike', emoji: '👎', label: 'Dislike' },
  { id: 'heart', emoji: '❤️', label: 'Love' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'confused', emoji: '😕', label: 'Confused' },
  { id: 'eyes', emoji: '👀', label: 'Eyes' }
];

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Something went wrong');
  }
  return response.json();
};

// Local storage utilities
const storage = {
  // Save data to localStorage
  set: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  // Get data from localStorage
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  // Remove data from localStorage
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  }
};

// API functions
const blogAPI = {
  // Get all blogs
  getBlogs: async (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/blogs?${queryString}`);
    return handleResponse(response);
  },

  // Search blogs
  searchBlogs: async (query) => {
    const response = await fetch(`${API_BASE_URL}/blogs/search?q=${encodeURIComponent(query)}`);
    return handleResponse(response);
  },

  // Get single blog by ID
  getBlog: async (id) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`);
    return handleResponse(response);
  },

  // Create new blog
  createBlog: async (blogData) => {
    const response = await fetch(`${API_BASE_URL}/blogs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  // Update blog
  updateBlog: async (id, blogData) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(blogData),
    });
    return handleResponse(response);
  },

  // Delete blog
  deleteBlog: async (id) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Add reaction to blog
  addReaction: async (blogId, reactionType) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/reactions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reactionType }),
    });
    return handleResponse(response);
  },

  // Add comment to blog
  addComment: async (blogId, commentData) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    });
    return handleResponse(response);
  },

  // Add reaction to comment
  addCommentReaction: async (blogId, commentId, reactionType) => {
    const response = await fetch(`${API_BASE_URL}/blogs/${blogId}/comments/${commentId}/reactions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reactionType }),
    });
    return handleResponse(response);
  }
};

// Format timestamp helper
const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now - time) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};

// Search helper function
const searchBlogs = (blogs, query) => {
  if (!query.trim()) return blogs;

  const searchTerm = query.toLowerCase().trim();
  
  return blogs.filter(blog => {
    // Search in title
    if (blog.title.toLowerCase().includes(searchTerm)) return true;
    
    // Search in description
    if (blog.description.toLowerCase().includes(searchTerm)) return true;
    
    // Search in file contents
    if (blog.files && blog.files.some(file => 
      file.filename.toLowerCase().includes(searchTerm) || 
      file.content.toLowerCase().includes(searchTerm)
    )) return true;
    
    // Search in author name
    if (blog.author && blog.author.toLowerCase().includes(searchTerm)) return true;
    
    return false;
  });
};

const CodeReviewPage = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [review, setReview] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [filteredBlogs, setFilteredBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [activeFile, setActiveFile] = useState(0);
  const [saving, setSaving] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking', 'connected', 'error'
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // State for creating/editing blog
  const [blogForm, setBlogForm] = useState({
    title: "",
    description: "",
    files: [{ filename: "", language: "javascript", content: "" }]
  });

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedBlogs = storage.get(LOCAL_STORAGE_KEYS.BLOGS, []);
    const savedCurrentBlog = storage.get(LOCAL_STORAGE_KEYS.CURRENT_BLOG);
    const savedComments = storage.get(LOCAL_STORAGE_KEYS.COMMENTS, []);
    
    if (savedBlogs.length > 0) {
      setBlogs(savedBlogs);
      setFilteredBlogs(savedBlogs);
      if (savedCurrentBlog) {
        setReview(savedCurrentBlog);
        setComments(savedComments);
      } else if (savedBlogs.length > 0) {
        setReview(savedBlogs[0]);
        setComments(savedBlogs[0].comments || []);
      }
      setLoading(false);
    }
    
    // Then try to fetch from backend
    checkBackendConnection();
  }, []);

  // Update filtered blogs when blogs or search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredBlogs(searchBlogs(blogs, searchQuery));
    } else {
      setFilteredBlogs(blogs);
    }
  }, [blogs, searchQuery]);

  // Save to localStorage whenever blogs, review, or comments change
  useEffect(() => {
    if (blogs.length > 0) {
      storage.set(LOCAL_STORAGE_KEYS.BLOGS, blogs);
    }
  }, [blogs]);

  useEffect(() => {
    if (review) {
      storage.set(LOCAL_STORAGE_KEYS.CURRENT_BLOG, review);
    }
  }, [review]);

  useEffect(() => {
    if (comments.length > 0) {
      storage.set(LOCAL_STORAGE_KEYS.COMMENTS, comments);
    }
  }, [comments]);

  const checkBackendConnection = async () => {
    try {
      setBackendStatus('checking');
      // Try to fetch blogs from backend
      const data = await blogAPI.getBlogs();
      setBackendStatus('connected');
      
      // If backend has data, use it and update localStorage
      if (data.blogs && data.blogs.length > 0) {
        setBlogs(data.blogs);
        setFilteredBlogs(data.blogs);
        if (!review && data.blogs.length > 0) {
          setReview(data.blogs[0]);
          setComments(data.blogs[0].comments || []);
        }
      }
    } catch (err) {
      console.error('Backend connection failed:', err);
      setBackendStatus('error');
      // Continue using localStorage data if available
    } finally {
      setLoading(false);
    }
  };

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const data = await blogAPI.getBlogs();
      setBlogs(data.blogs);
      setFilteredBlogs(data.blogs);
      // Set the first blog as active review if available
      if (data.blogs.length > 0) {
        await fetchBlog(data.blogs[0]._id);
      } else {
        setReview(null);
      }
    } catch (err) {
      setError('Failed to fetch blogs: ' + err.message);
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      
      if (backendStatus === 'connected') {
        // Use backend search if available
        const data = await blogAPI.searchBlogs(query);
        setFilteredBlogs(data.blogs || []);
      } else {
        // Use local search
        setFilteredBlogs(searchBlogs(blogs, query));
      }
    } catch (err) {
      console.error('Search error:', err);
      // Fallback to local search if backend search fails
      setFilteredBlogs(searchBlogs(blogs, query));
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredBlogs(blogs);
    setIsSearching(false);
  };

  const fetchBlog = async (id) => {
    try {
      const blog = await blogAPI.getBlog(id);
      setReview(blog);
      setComments(blog.comments || []);
    } catch (err) {
      setError('Failed to fetch blog: ' + err.message);
      console.error('Error fetching blog:', err);
    }
  };

  const handleReaction = async (reactionType) => {
    if (!review) return;
    
    try {
      // Update local state optimistically first
      const updatedReview = {
        ...review,
        reactions: {
          ...review.reactions,
          [reactionType]: (review.reactions?.[reactionType] || 0) + 1
        }
      };
      
      setReview(updatedReview);
      
      // Try to update backend if connected
      if (backendStatus === 'connected') {
        await blogAPI.addReaction(review._id, reactionType);
      }
    } catch (err) {
      setError('Failed to add reaction: ' + err.message);
      console.error('Error adding reaction:', err);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !review) return;

    try {
      const commentData = {
        id: Date.now(), // Temporary ID for local storage
        author: "Current User",
        avatar: "😊",
        content: newComment,
        fileId: review.files[activeFile]?._id || review.files[activeFile]?.id,
        createdAt: new Date().toISOString(),
        reactions: {}
      };

      // Update local state immediately
      const newComments = [...comments, commentData];
      setComments(newComments);
      setNewComment('');

      // Try to save to backend if connected
      if (backendStatus === 'connected' && review._id) {
        const backendCommentData = {
          author: commentData.author,
          avatar: commentData.avatar,
          content: commentData.content,
          fileId: commentData.fileId
        };
        
        const newCommentData = await blogAPI.addComment(review._id, backendCommentData);
        
        // Update with the actual ID from backend
        setComments(prev => 
          prev.map(comment => 
            comment.id === commentData.id ? { ...newCommentData, id: commentData.id } : comment
          )
        );
      }
    } catch (err) {
      setError('Failed to add comment: ' + err.message);
      console.error('Error adding comment:', err);
    }
  };

  const handleCommentReaction = async (commentId, reactionType) => {
    if (!review) return;

    try {
      // Update local state optimistically
      setComments(prev => prev.map(comment => {
        if (comment._id === commentId || comment.id === commentId) {
          return {
            ...comment,
            reactions: {
              ...comment.reactions,
              [reactionType]: (comment.reactions?.[reactionType] || 0) + 1
            }
          };
        }
        return comment;
      }));

      // Try to update backend if connected
      if (backendStatus === 'connected' && review._id) {
        await blogAPI.addCommentReaction(review._id, commentId, reactionType);
      }
    } catch (err) {
      setError('Failed to add comment reaction: ' + err.message);
      console.error('Error adding comment reaction:', err);
    }
  };

  const getFileComments = (fileId) => {
    return comments.filter(comment => comment.fileId === fileId);
  };

  // Functions for creating new code blog
  const handleCreateNewBlog = () => {
    setIsCreating(true);
    setIsEditing(false);
    setBlogForm({
      title: "",
      description: "",
      files: [{ filename: "", language: "javascript", content: "" }]
    });
  };

  // Function to edit existing blog
  const handleEditBlog = () => {
    if (!review) return;
    
    setIsEditing(true);
    setIsCreating(false);
    setBlogForm({
      title: review.title,
      description: review.description,
      files: review.files.map(file => ({
        filename: file.filename,
        language: file.language || "javascript",
        content: file.content
      }))
    });
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleSaveBlog = async () => {
    if (!blogForm.title.trim() || !blogForm.files[0].filename.trim()) return;

    try {
      setSaving(true);
      const blogToSave = {
        ...blogForm,
        author: "Current User",
        avatar: "😊",
        status: "pending",
        createdAt: isEditing ? review.createdAt : new Date().toISOString(),
        comments: isEditing ? comments : [],
        reactions: isEditing ? (review.reactions || {}) : {}
      };

      let savedBlog;

      if (backendStatus === 'connected') {
        if (isEditing) {
          // Update existing blog
          savedBlog = await blogAPI.updateBlog(review._id, blogToSave);
        } else {
          // Create new blog
          savedBlog = await blogAPI.createBlog(blogToSave);
        }
      } else {
        // Save locally with temporary ID
        savedBlog = {
          ...blogToSave,
          _id: isEditing ? review._id : `local_${Date.now()}`,
          id: isEditing ? review.id : `local_${Date.now()}`
        };
      }

      // Update state with the saved blog
      setReview(savedBlog);
      setComments(isEditing ? comments : []);
      setIsCreating(false);
      setIsEditing(false);
      
      // Update blogs list
      if (isEditing) {
        const updatedBlogs = blogs.map(blog => 
          blog._id === savedBlog._id ? savedBlog : blog
        );
        setBlogs(updatedBlogs);
      } else {
        const updatedBlogs = [savedBlog, ...blogs];
        setBlogs(updatedBlogs);
      }
      
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error saving blog:', err);
      setError('Failed to save blog: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Function to delete blog
  const handleDeleteBlog = async () => {
    if (!review) return;

    try {
      setSaving(true);
      
      if (backendStatus === 'connected') {
        await blogAPI.deleteBlog(review._id);
      }

      // Remove from local state
      const updatedBlogs = blogs.filter(blog => blog._id !== review._id);
      setBlogs(updatedBlogs);
      
      // Set next available blog as active, or clear if none left
      if (updatedBlogs.length > 0) {
        setReview(updatedBlogs[0]);
        setComments(updatedBlogs[0].comments || []);
      } else {
        setReview(null);
        setComments([]);
      }
      
      setShowDeleteConfirm(false);
      setError(''); // Clear any previous errors
    } catch (err) {
      console.error('Error deleting blog:', err);
      setError('Failed to delete blog: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBlogFormChange = (field, value) => {
    setBlogForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (fileIndex, field, value) => {
    const updatedFiles = [...blogForm.files];
    updatedFiles[fileIndex] = {
      ...updatedFiles[fileIndex],
      [field]: value
    };
    setBlogForm(prev => ({
      ...prev,
      files: updatedFiles
    }));
  };

  const addNewFile = () => {
    setBlogForm(prev => ({
      ...prev,
      files: [
        ...prev.files,
        { filename: "", language: "javascript", content: "" }
      ]
    }));
  };

  const removeFile = (fileIndex) => {
    if (blogForm.files.length > 1) {
      setBlogForm(prev => ({
        ...prev,
        files: prev.files.filter((_, index) => index !== fileIndex)
      }));
    }
  };

  // Clear all local data (useful for debugging)
  const clearLocalData = () => {
    storage.remove(LOCAL_STORAGE_KEYS.BLOGS);
    storage.remove(LOCAL_STORAGE_KEYS.CURRENT_BLOG);
    storage.remove(LOCAL_STORAGE_KEYS.COMMENTS);
    storage.remove(LOCAL_STORAGE_KEYS.REACTIONS);
    setBlogs([]);
    setFilteredBlogs([]);
    setReview(null);
    setComments([]);
    setSearchQuery('');
    setError('Local data cleared. Refresh the page to start fresh.');
  };

  // Show loading state
  if (loading && !review) {
    return (
      <Base>
        <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading blogs...</p>
          </div>
        </div>
      </Base>
    );
  }

  return (
    <Base>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Backend Status & Data Info */}
          <div className="mb-6 space-y-3">
            {backendStatus === 'checking' && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-800 mr-3"></div>
                  <span>Checking backend connection...</span>
                </div>
              </div>
            )}

            {backendStatus === 'error' && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">⚠️</span>
                    <div>
                      <strong>Using Local Storage</strong>
                      <p className="text-sm mt-1">
                        Backend unavailable. Data is saved locally and will persist after refresh.
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={checkBackendConnection}
                      className="ml-4 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                    >
                      Retry Connection
                    </button>
                    <button 
                      onClick={clearLocalData}
                      className="ml-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Clear Data
                    </button>
                  </div>
                </div>
              </div>
            )}

            {backendStatus === 'connected' && (
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">✅</span>
                    <span>Connected to backend server - Data is synced</span>
                  </div>
                  <button 
                    onClick={clearLocalData}
                    className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Clear Local Data
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span>{error}</span>
                <button 
                  onClick={() => setError('')}
                  className="text-red-500 hover:text-red-700 ml-4"
                >
                  ×
                </button>
              </div>
            </div>
          )}
          
          {/* Header with Search and Create Button */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Code Reviews {filteredBlogs.length > 0 && `(${filteredBlogs.length}${searchQuery ? ' found' : ''})`}
            </h1>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 lg:flex-initial">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search blogs by title, description, code..."
                    className="w-full lg:w-80 px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Search Info */}
                {searchQuery && (
                  <div className="mt-2 text-sm text-gray-600">
                    {isSearching ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                        Searching...
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span>
                          Found {filteredBlogs.length} blog{filteredBlogs.length !== 1 ? 's' : ''} for "{searchQuery}"
                        </span>
                        <button
                          onClick={clearSearch}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Clear search
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Create New Blog Button */}
              <button
                onClick={handleCreateNewBlog}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium whitespace-nowrap"
              >
                + Create New Code Blog
              </button>
            </div>
          </div>

          {/* Blog List Sidebar for Navigation */}
          {blogs.length > 0 && !isCreating && !isEditing && (
            <div className="mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {searchQuery ? 'Search Results' : 'All Blogs'}
                </h3>
                <div className="max-h-40 overflow-y-auto">
                  <div className="space-y-2">
                    {filteredBlogs.length > 0 ? (
                      filteredBlogs.map(blog => (
                        <button
                          key={blog._id || blog.id}
                          onClick={() => {
                            setReview(blog);
                            setComments(blog.comments || []);
                            setActiveFile(0);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            review && (review._id === blog._id || review.id === blog.id)
                              ? 'border-black bg-black text-white'
                              : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate">{blog.title}</h4>
                              <p className={`text-sm mt-1 truncate ${
                                review && (review._id === blog._id || review.id === blog.id)
                                  ? 'text-gray-200'
                                  : 'text-gray-600'
                              }`}>
                                {blog.description}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                review && (review._id === blog._id || review.id === blog.id)
                                  ? 'bg-white text-black'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {blog.files?.length || 0} file{(blog.files?.length || 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <svg className="h-8 w-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mt-2">No blogs found matching "{searchQuery}"</p>
                        <button
                          onClick={clearSearch}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Clear search
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(isCreating || isEditing) ? (
            /* Create/Edit Blog Form */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {isEditing ? 'Edit Code Blog' : 'Create New Code Blog'}
              </h2>
              
              <div className="space-y-6">
                {/* Title Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={blogForm.title}
                    onChange={(e) => handleBlogFormChange('title', e.target.value)}
                    placeholder="Enter a descriptive title for your code..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={blogForm.description}
                    onChange={(e) => handleBlogFormChange('description', e.target.value)}
                    placeholder="Describe what your code does, technologies used, etc."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black resize-none"
                  />
                </div>

                {/* Files Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Code Files
                    </label>
                    <button
                      onClick={addNewFile}
                      className="px-3 py-1 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                    >
                      + Add File
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {blogForm.files.map((file, fileIndex) => (
                      <div key={fileIndex} className="border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Filename
                            </label>
                            <input
                              type="text"
                              value={file.filename}
                              onChange={(e) => handleFileChange(fileIndex, 'filename', e.target.value)}
                              placeholder="e.g., controllers/auth.js"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Language
                            </label>
                            <select
                              value={file.language}
                              onChange={(e) => handleFileChange(fileIndex, 'language', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                            >
                              <option value="javascript">JavaScript</option>
                              <option value="python">Python</option>
                              <option value="java">Java</option>
                              <option value="cpp">C++</option>
                              <option value="html">HTML</option>
                              <option value="css">CSS</option>
                              <option value="typescript">TypeScript</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Code Content
                          </label>
                          <textarea
                            value={file.content}
                            onChange={(e) => handleFileChange(fileIndex, 'content', e.target.value)}
                            placeholder="Paste your code here..."
                            rows="8"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black font-mono text-sm resize-none"
                          />
                        </div>
                        
                        {blogForm.files.length > 1 && (
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => removeFile(fileIndex)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                            >
                              Remove File
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between pt-6 border-t border-gray-200">
                  {isEditing && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={saving}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      Delete Blog
                    </button>
                  )}
                  <div className="flex space-x-4 ml-auto">
                    <button
                      onClick={handleCancelCreate}
                      disabled={saving}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveBlog}
                      disabled={!blogForm.title.trim() || !blogForm.files[0].filename.trim() || saving}
                      className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {isEditing ? 'Updating...' : 'Publishing...'}
                        </>
                      ) : (
                        isEditing ? 'Update Code Blog' : 'Publish Code Blog'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : !review ? (
            /* No blogs available */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Code Blogs Yet</h2>
              <p className="text-gray-600 mb-6">Create your first code blog to get started with code reviews!</p>
              <button
                onClick={handleCreateNewBlog}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Create Your First Code Blog
              </button>
            </div>
          ) : (
            /* Existing Code Review Display */
            <>
              {/* Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-2xl font-bold text-gray-900">{review.title}</h1>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      review.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : review.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {review.status}
                    </span>
                    {review._id && review._id.startsWith('local_') && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                        Local
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{review.avatar}</span>
                    <span className="font-medium">{review.author}</span>
                  </div>
                  <span>•</span>
                  <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                  {isEditing && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-medium">Editing</span>
                    </>
                  )}
                </div>
                
                <p className="mt-4 text-gray-700">{review.description}</p>
                
                {/* Edit and Delete Buttons */}
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={handleEditBlog}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Edit Blog
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete Blog
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Files and Code */}
                <div className="lg:col-span-2 space-y-6">
                  {/* File Tabs */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                      <nav className="flex -mb-px">
                        {review.files.map((file, index) => (
                          <button
                            key={file._id || file.id || index}
                            onClick={() => setActiveFile(index)}
                            className={`py-3 px-4 border-b-2 font-medium text-sm ${
                              activeFile === index
                                ? 'border-black text-black'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            {file.filename}
                          </button>
                        ))}
                      </nav>
                    </div>
                    
                    {/* Code Display */}
                    <div className="p-4">
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
                          <span className="text-sm text-gray-300">
                            {review.files[activeFile]?.filename}
                          </span>
                          <button 
                            onClick={() => navigator.clipboard.writeText(review.files[activeFile]?.content || '')}
                            className="text-gray-400 hover:text-white text-sm transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <pre className="p-4 text-sm text-gray-100 overflow-x-auto">
                          <code>{review.files[activeFile]?.content}</code>
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Reactions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Reactions</h3>
                    <div className="flex flex-wrap gap-2">
                      {reactionTypes.map(reaction => (
                        <button
                          key={reaction.id}
                          onClick={() => handleReaction(reaction.id)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-black hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg">{reaction.emoji}</span>
                          <span className="text-sm text-gray-700">{reaction.label}</span>
                          {review.reactions?.[reaction.id] > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">
                              {review.reactions[reaction.id]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column - Comments */}
                <div className="space-y-6">
                  {/* Add Comment */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Comment</h3>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add your review comment..."
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black resize-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Post Comment
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Comments ({getFileComments(review.files[activeFile]?._id || review.files[activeFile]?.id).length})
                      </h3>
                    </div>
                    
                    <div className="divide-y divide-gray-200">
                      {getFileComments(review.files[activeFile]?._id || review.files[activeFile]?.id).map(comment => (
                        <div key={comment._id || comment.id} className="p-4">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <span className="text-2xl">{comment.avatar}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900">{comment.author}</span>
                                <span className="text-sm text-gray-500">
                                  {formatTimeAgo(comment.createdAt)}
                                </span>
                                {comment.lineNumber && (
                                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                    Line {comment.lineNumber}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mb-3">{comment.content}</p>
                              
                              {/* Comment Reactions */}
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(comment.reactions || {}).map(([reactionType, count]) => {
                                  const reaction = reactionTypes.find(r => r.id === reactionType);
                                  return reaction ? (
                                    <button
                                      key={reactionType}
                                      onClick={() => handleCommentReaction(comment._id || comment.id, reactionType)}
                                      className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                      <span>{reaction.emoji}</span>
                                      <span className="text-xs text-gray-700">{count}</span>
                                    </button>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {getFileComments(review.files[activeFile]?._id || review.files[activeFile]?.id).length === 0 && (
                        <div className="p-8 text-center">
                          <div className="text-gray-400 text-4xl mb-2">💬</div>
                          <p className="text-gray-500">No comments yet</p>
                          <p className="text-sm text-gray-400">Be the first to comment on this file</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Blog</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete "{review?.title}"? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteBlog}
                    disabled={saving}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete Blog'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Base>
  );
};

export default CodeReviewPage;