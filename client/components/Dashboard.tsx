"use client"
import { useState } from "react"
import NotificationBar, { type NotificationType } from "./NotificationBar"
import QueryRow from "./QueryRow"
import FetchedVideos from "./FetchedVideos"
import ProcessedVideos from "./ProcessedVideos"
import PermittedVideos from "./PermittedVideos"
import "./styles.css"

const Dashboard = () => {
  const [notification, setNotification] = useState({
    message: "",
    type: null as NotificationType,
  })

  const showNotification = (message: string, type: "error" | "warning" | "success") => {
    setNotification({ message, type })
  }

  const clearNotification = () => {
    setNotification({ message: "", type: null })
  }

  return (
    <div className="dashboard">
      <NotificationBar message={notification.message} type={notification.type} onClose={clearNotification} />

      <header className="dashboard-header">
          <h1>Secure Rights</h1>
          <nav>
            <ul className="navbar-links">
              <li><a href="#about">About</a></li>
              <li><a href="#feedback">Feedback</a></li>
            </ul>
          </nav>
      </header>

      <main className="dashboard-main">
        <QueryRow onNotification={showNotification} />

        <div className="dashboard-grid">
          <div className="grid-column">
            <FetchedVideos onNotification={showNotification} />
          </div>

          <div className="grid-column">
            <ProcessedVideos onNotification={showNotification} />
          </div>

          <div className="grid-column">
            <PermittedVideos onNotification={showNotification} />
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>
          We are team <span className="team-name">Tech-NO-Logic</span>
        </p>
      </footer>
    </div>
  )
}

export default Dashboard
