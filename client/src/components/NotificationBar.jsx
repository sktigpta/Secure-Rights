"use client"
import { useEffect } from "react"
import { X } from "lucide-react"

const NotificationBar = ({ message, type, onClose }) => {
  if (!message) return null

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [message, onClose])

  const getNotificationClass = () => {
    switch (type) {
      case "error":
        return "bg-red-500"
      case "warning":
        return "bg-amber-500"
      case "success":
        return "bg-emerald-500"
      default:
        return "bg-blue-500"
    }
  }

  return (
    <div className={`sticky top-0 left-0 right-0 z-50 px-5 py-1 flex justify-between items-center text-white animate-[slideDown_0.3s_ease] ${getNotificationClass()}`}>
      <div className="flex items-center gap-2">
        {message}
      </div>
      <button 
        onClick={onClose} 
        className="text-white opacity-80 hover:opacity-100 transition-opacity duration-200"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default NotificationBar
