"use client"

import { useEffect } from "react"
import { AlertCircle, AlertTriangle, CheckCircle, X } from "lucide-react"
import "./styles.css"

export type NotificationType = "error" | "warning" | "success" | null

interface NotificationBarProps {
  message: string
  type: NotificationType
  onClose: () => void
  duration?: number
}

const NotificationBar = ({ message, type, onClose, duration = 5000 }: NotificationBarProps) => {
  useEffect(() => {
    if (!message || !type) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [message, type, onClose, duration])

  if (!message || !type) return null

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertCircle className="notification-icon" />
      case "warning":
        return <AlertTriangle className="notification-icon" />
      case "success":
        return <CheckCircle className="notification-icon" />
      default:
        return null
    }
  }

  return (
    <div className={`notification-bar notification-${type}`}>
      <div className="notification-content">
        {getIcon()}
        <span>{message}</span>
      </div>
      <button className="notification-close" onClick={onClose}>
        <X size={18} />
      </button>
    </div>
  )
}

export default NotificationBar

