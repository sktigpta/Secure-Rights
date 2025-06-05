"use client"
import { useEffect, useState, useRef } from "react"
import { X, HelpCircle } from "lucide-react"

const QueryRow = ({ onNotification }) => {
  const [queries, setQueries] = useState([])
  const [newQuery, setNewQuery] = useState("")
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [displayedPlaceholder, setDisplayedPlaceholder] = useState("")
  const scrollContainerRef = useRef(null)
  const typingIntervalRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  
  // Mock API URL for demo - replace with your actual API
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001/api"

  const placeholders = ["Add character name...", "Add dialogue...", "Add movie title..."]

  // Typing effect logic
  useEffect(() => {
    let charIndex = 0
    const currentText = placeholders[placeholderIndex]

    // Clear any existing intervals/timeouts
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current)
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Reset displayed placeholder for new text
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
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [placeholderIndex])

  useEffect(() => {
    fetchQueries()
  }, [])

  const fetchQueries = async () => {
    try {
      // Start with empty queries - users will add their own
      setQueries([])
      
      /* 
      // Actual API call - uncomment and modify as needed
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
      */
    } catch (error) {
      console.error('Fetch queries error:', error)
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
      // Mock API call - replace with actual API
      const newQueryObj = {
        id: Date.now(), // Simple ID generation for demo
        query: trimmedQuery
      }
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setQueries((prev) => [...prev, newQueryObj])
      setNewQuery("")
      onNotification?.(`Query "${trimmedQuery}" added successfully`, "success")

      // Auto-scroll to show new query
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
        }
      }, 100)

      /* 
      // Actual API call - uncomment and modify as needed
      const response = await fetch(`${API_URL}/search-queries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: trimmedQuery })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setQueries((prev) => [...prev, data])
      setNewQuery("")
      onNotification?.(`Query "${trimmedQuery}" added successfully`, "success")
      */
    } catch (error) {
      console.error('Add query error:', error)
      onNotification?.("Failed to add query", "error")
    }
  }

  const deleteQuery = async (id, queryText) => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 300))
      
      setQueries((prev) => prev.filter((query) => query.id !== id))
      onNotification?.(`Query "${queryText}" deleted`, "success")

      /* 
      // Actual API call - uncomment and modify as needed
      const response = await fetch(`${API_URL}/search-queries/${id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      setQueries((prev) => prev.filter((query) => query.id !== id))
      onNotification?.(`Query "${queryText}" deleted`, "success")
      */
    } catch (error) {
      console.error('Delete query error:', error)
      onNotification?.("Failed to delete query", "error")
    }
  }

  return (
    <div className="flex items-center gap-3 w-full overflow-x-auto relative">
      <input
        type="text"
        className="min-w-[250px] py-2 px-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-600 transition-colors duration-200"
        placeholder={newQuery ? "" : displayedPlaceholder}
        value={newQuery}
        onChange={(e) => setNewQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="flex gap-2 flex-nowrap" ref={scrollContainerRef}>
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

      {/* Help Icon - Hidden on mobile */}
      <div className="hidden md:block absolute top-0 right-0 group">
        <div className="relative">
          <div className="w-2 h-2 bg-red-500 rounded-full flex items-center justify-center cursor-help hover:w-6 hover:h-6 transition-all duration-200 group-hover:bg-blue-500">
            <HelpCircle 
              size={12} 
              className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
            />
          </div>
          
          {/* Tooltip */}
          <div className="absolute right-0 top-8 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
            <div className="font-medium mb-1">How it works:</div>
            <div>Add character names, dialogue, or movie titles. The system fetches videos from YouTube based on your provided queries.</div>
            {/* Arrow */}
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-800 rotate-45"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QueryRow