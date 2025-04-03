const admin = require("firebase-admin");

const db = admin.firestore();
const searchQueriesCollection = db.collection("search_queries");

/**
 * Get all search queries
 */
const getSearchQueries = async (req, res) => {
  try {
    const snapshot = await searchQueriesCollection.get();
    const queries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(queries);
  } catch (error) {
    console.error("Error fetching search queries:", error);
    res.status(500).json({ error: "Failed to fetch search queries" });
  }
};

/**
 * Add a new search query
 */
const addSearchQuery = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    const newQuery = await searchQueriesCollection.add({ query, createdAt: new Date() });

    res.status(201).json({ id: newQuery.id, query });
  } catch (error) {
    console.error("Error adding search query:", error);
    res.status(500).json({ error: "Failed to add search query" });
  }
};

/**
 * Delete a search query by ID
 */
const deleteSearchQuery = async (req, res) => {
  try {
    const { id } = req.params;
    await searchQueriesCollection.doc(id).delete();

    res.status(200).json({ message: "Search query deleted successfully" });
  } catch (error) {
    console.error("Error deleting search query:", error);
    res.status(500).json({ error: "Failed to delete search query" });
  }
};

module.exports = { getSearchQueries, addSearchQuery, deleteSearchQuery };
