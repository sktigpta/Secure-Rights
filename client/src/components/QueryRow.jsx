"use client"
import { useEffect, useState, useRef } from "react"
import axios from "axios"
import { X } from "lucide-react"

const QueryRow = ({ onNotification }) => {
  const [queries, setQueries] = useState([]) 
  const [newQuery, setNewQuery] = useState("")
  const scrollContainerRef = useRef(null)
  const API_URL = import.meta.env.VITE_API_URL 

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    try {
      const response = await axios.get(`${API_URL}/search-queries`)
      if (Array.isArray(response.data)) {
        setQueries(response.data)
      } else {
        onNotification("Received data is not an array", "error")
      }
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
      const response = await axios.post(`${API_URL}/search-queries`, { query: newQuery })
      setQueries((prevQueries) => [...prevQueries, response.data])
      setNewQuery("")
      onNotification(`Query "${newQuery}" added successfully`, "success")

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
      await axios.delete(`${API_URL}/search-queries/${id}`)
      setQueries((prevQueries) => prevQueries.filter((query) => query.id !== id))
      onNotification(`Query "${queryText}" deleted`, "success")
    } catch (error) {
      onNotification("Failed to delete query", "error")
    }
  }

  return (
    <div className="flex items-center gap-3 py-2 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
      <input
        type="text"
        className="min-w-[200px] py-2 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-600 transition-colors duration-200"
        placeholder="Add new query..."
        value={newQuery}
        onChange={(e) => setNewQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="flex gap-2 flex-nowrap" ref={scrollContainerRef}>
        {Array.isArray(queries) && queries.map((query) => (
          <div className="flex items-center gap-1.5 bg-sky-100 text-sky-700 rounded-full py-1.5 px-3 text-sm whitespace-nowrap" key={query.id}>
            <span>{query.query}</span>
            <button
              className="flex items-center justify-center text-sky-700 opacity-70 hover:opacity-100 transition-opacity duration-200"
              onClick={() => deleteQuery(query.id, query.query)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default QueryRow