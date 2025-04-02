"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import NotificationBar from "./NotificationBar"
import QueryRow from "./QueryRow"
import FetchedVideos from "./FetchedVideos"
import ProcessedVideos from "./ProcessedVideos"
import PermittedVideos from "./PermittedVideos"
import { getUserDetails } from "../services/service"
import { Shield, LogOut } from "lucide-react";


const Dashboard = ({ token }) => {
  const [notification, setNotification] = useState({
    message: "",
    type: null,
  })
  const [userName, setUserName] = useState('')

  // Show notification function
  const showNotification = (message, type) => {
    setNotification({ message, type })
  }

  // Clear notification function
  const clearNotification = () => {
    setNotification({ message: "", type: null })
  }

  // Fetch user details function
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const userDetails = await getUserDetails(token)
        setUserName(userDetails.name)
      } catch (error) {
        console.error("Error fetching user details:", error)
      }
    }

    if (token) {
      fetchUserDetails()
    }
  }, [token])

  return (
    <div className="min-h-screen flex flex-col">
      <NotificationBar message={notification.message} type={notification.type} onClose={clearNotification} />

      {/* Updated Header */}
      <header className="py-3 px-10 border-b border-gray-300 bg-blue-700 text-white flex items-center justify-between shadow-md">
        <Link to="/" className="text-3xl font-bold tracking-wide">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-white" />
            <span className="text-lg font-bold">SecureRights</span>
          </div>
        </Link>
        <nav>
          <ul className="flex gap-6 items-center">
            <li>
              <a className = "px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-sm font-medium cursor-pointer"
                href="https://docs.google.com/forms/d/e/1FAIpQLSdZEqtUaM02fIbDwkcbhHuN-CSexYL9dswws5Jhm_DnPb7OPA/viewform?usp=sf_link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Feedback
              </a>
            </li>
            {userName && (
              <li className="bg-white text-blue-700 px-4 py-1 rounded-full font-semibold shadow-sm">{userName}</li>
            )}
          </ul>
        </nav>
      </header>

      <main className="flex-1 p-5 flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
        <QueryRow onNotification={showNotification} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <FetchedVideos onNotification={showNotification} />
          </div>

          <div>
            <ProcessedVideos onNotification={showNotification} />
          </div>

          <div>
            <PermittedVideos onNotification={showNotification} />
          </div>
        </div>
      </main>

      <footer className="p-4 text-right text-gray-500 text-sm border-t border-gray-300 bg-gray-50">
        <p>
          We are team <span className="font-semibold">Tech-NO-Logic</span>
        </p>
      </footer>
    </div>
  )
}

export default Dashboard