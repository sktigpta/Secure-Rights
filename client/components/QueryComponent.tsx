"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import "./videos-and-cards.css"

const QueryComponent = () => {
  const [queries, setQueries] = useState([])
  const [newQuery, setNewQuery] = useState("")
  const API_URL = "backend-mubi4l7ej-shaktidhar-guptas-projects.vercel.appsearch-queries"

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    try {
      const response = await axios.get(API_URL)
      setQueries(response.data)
    } catch (error) {
      console.error("❌ Error fetching queries:", error)
    }
  }

  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && newQuery.trim()) {
      try {
        const response = await axios.post(API_URL, { query: newQuery })
        setQueries([...queries, response.data])
        setNewQuery("")
      } catch (error) {
        console.error("❌ Error adding query:", error)
      }
    }
  }

  const deleteQuery = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`)
      setQueries(queries.filter((query) => query.id !== id))
    } catch (error) {
      console.error("❌ Error deleting query:", error)
    }
  }

  return (
    <div className="query-card">
      <h3 className="card-header-title">Add Query</h3>

      <div className="query-input">
        <input
          type="text"
          className="search-box"
          placeholder="Add Query"
          value={newQuery}
          onChange={(e) => setNewQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="queries-list">
        {queries.length === 0 ? (
          <p className="no-content">No queries found.</p>
        ) : (
          queries.map((query) => (
            <div className="query-item" key={query.id}>
              <span className="query-text">{query.query}</span>
              <button className="delete-btn" onClick={() => deleteQuery(query.id)}>
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default QueryComponent

