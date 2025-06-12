"use client"
import { useEffect, useState, useRef } from "react"
import { X, HelpCircle } from "lucide-react"

const QueryRow = ({ onNotification }) => {
  const [queries, setQueries] = useState([])
  const [newQuery, setNewQuery] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("")
  const typingIntervalRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  const API_URL = process.env.REACT_APP_API_URL || "https://backend.securerights.app/api"

  const placeholders = ["Add character name...", "Add dialogue...", "Add movie title..."]

  // Typing effect logic
  useEffect(() => {
    let charIndex = 0
    const currentText = placeholders[placeholderIndex]

    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    setDisplayedPlaceholder("")

    typingIntervalRef.current = setInterval(() => {
      if (charIndex < currentText.length) {
        setDisplayedPlaceholder(currentText.substring(0, charIndex + 1))
        charIndex++
      } else {
        clearInterval(typingIntervalRef.current)
        typingTimeoutRef.current = setTimeout(() => {
          setDisplayedPlaceholder("")
          setPlaceholderIndex((prev) => (prev + 1) % placeholders.length)
        }, 1500)
      }
    }, 100)

    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [placeholderIndex])

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    try {
      const response = await fetch(`${API_URL}/search-queries`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (Array.isArray(data)) {
        setQueries(data)
      } else {
        onNotification?.("Received data is not an array", "error")
      }
    } catch (error) {
      console.error("Fetch queries error:", error)
      onNotification?.("Failed to fetch queries", "error")
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && newQuery.trim()) {
      addQuery()
    }
  }

  const addQuery = async () => {
    const trimmedQuery = newQuery.trim()
    if (!trimmedQuery) return

    try {
      const response = await fetch(`${API_URL}/search-queries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmedQuery }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setQueries((prev) => [...prev, data])
      setNewQuery("")
      onNotification?.(`Query "${trimmedQuery}" added successfully`, "success")
    } catch (error) {
      console.error("Add query error:", error)
      onNotification?.("Failed to add query", "error")
    }
  }

  const deleteQuery = async (id, queryText) => {
    try {
      const response = await fetch(`${API_URL}/search-queries/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setQueries((prev) => prev.filter((query) => query.id !== id))
      onNotification?.(`Query "${queryText}" deleted`, "success")
    } catch (error) {
      console.error("Delete query error:", error)
      onNotification?.("Failed to delete query", "error")
    }
  }

  return (
    <div className="w-full">
      {/* Input Section */}
      <div className="relative w-full mb-3 sm:mb-0 sm:min-w-[250px] sm:max-w-[300px]">
        <input
          type="text"
          className="w-full py-2 pl-3 pr-8 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-600 transition-colors duration-200"
          placeholder={newQuery ? "" : displayedPlaceholder}
          value={newQuery}
          onChange={(e) => setNewQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="absolute right-2.5 top-1/2 transform -translate-y-1/2 group cursor-help">
          <HelpCircle size={12} className="text-gray-400" />
          <div className="absolute right-0 top-6 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-500">
            <div>Add character names, dialogue, or movie titles. The system fetches videos from YouTube based on your provided queries.</div>
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </div>
      </div>

      {/* Tags Section - Responsive */}
      {queries.length > 0 && (
        <div className="w-full">
          {/* Mobile: Horizontal scroll */}
          <div className="flex sm:hidden overflow-x-auto scrollbar-hide gap-2 pb-2 -mx-1 px-1">
            <div className="flex gap-2 min-w-max">
              {queries.map((query) => (
                <div
                  className="flex items-center gap-1.5 bg-sky-100 text-sky-700 rounded-full py-1.5 px-3 text-sm whitespace-nowrap flex-shrink-0"
                  key={query.id}
                >
                  <span>{query.query}</span>
                  <button
                    className="flex items-center justify-center text-sky-700 opacity-70 hover:opacity-100 transition-opacity duration-200"
                    onClick={() => deleteQuery(query.id, query.query)}
                    aria-label={`Delete query: ${query.query}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Flex wrap */}
          <div className="hidden sm:flex gap-2 flex-wrap">
            {queries.map((query) => (
              <div
                className="flex items-center gap-1.5 bg-sky-100 text-sky-700 rounded-full py-1.5 px-3 text-sm whitespace-nowrap"
                key={query.id}
              >
                <span>{query.query}</span>
                <button
                  className="flex items-center justify-center text-sky-700 opacity-70 hover:opacity-100 transition-opacity duration-200"
                  onClick={() => deleteQuery(query.id, query.query)}
                  aria-label={`Delete query: ${query.query}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

export default QueryRow
