"use client"

import { useEffect, useState, useRef } from "react"
import axios from "axios"
import { X } from "lucide-react"
import "./styles.css"

interface QueryRowProps {
  onNotification: (message: string, type: "error" | "warning" | "success") => void
}

const QueryRow = ({ onNotification }: QueryRowProps) => {
  const [queries, setQueries] = useState([])
  const [newQuery, setNewQuery] = useState("")
  const scrollContainerRef = useRef(null)
  const API_URL = "https://backend.securerights.app/api/search-queries"

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    try {
      const response = await axios.get(API_URL)
      setQueries(response.data)
    } catch (error) {
      onNotification("Failed to fetch queries", "error")
    }
  }

  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && newQuery.trim()) {
      addQuery()
    }
  }

  const addQuery = async () => {
    if (!newQuery.trim()) return

    try {
      const response = await axios.post(API_URL, { query: newQuery })
      setQueries([...queries, response.data])
      setNewQuery("")
      onNotification(`Query "${newQuery}" added successfully`, "success")

      // Scroll to the end after adding
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
        }
      }, 100)
    } catch (error) {
      onNotification("Failed to add query", "error")
    }
  }

  const deleteQuery = async (id, queryText) => {
    try {
      await axios.delete(`${API_URL}/${id}`)
      setQueries(queries.filter((query) => query.id !== id))
      onNotification(`Query "${queryText}" deleted`, "success")
    } catch (error) {
      onNotification("Failed to delete query", "error")
    }
  }

  return (
    <div className="query-row">
      <input
        type="text"
        className="query-input-minimal"
        placeholder="Add new query..."
        value={newQuery}
        onChange={(e) => setNewQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="query-tags-container" ref={scrollContainerRef}>
        {queries.map((query) => (
          <div className="query-tag-minimal" key={query.id}>
            <span>{query.query}</span>
            <button className="query-tag-delete-minimal" onClick={() => deleteQuery(query.id, query.query)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QueryRow

