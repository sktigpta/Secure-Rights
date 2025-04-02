"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import NotificationBar from "./NotificationBar"
import QueryRow from "./QueryRow"
import FetchedVideos from "./FetchedVideos"
import ProcessedVideos from "./ProcessedVideos"
import PermittedVideos from "./PermittedVideos"
import { getUserDetails } from "../services/service"

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

      <header className="py-1 px-20 border-b border-gray-200 bg-blue-600 text-white flex flex-row justify-between">
        <Link to="/"><h1 className="text-2xl font-semibold">Secure Rights</h1></Link>
        <nav>
          <ul className="flex flex-row gap-4 items-center justify-center h-full">
            <li>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdZEqtUaM02fIbDwkcbhHuN-CSexYL9dswws5Jhm_DnPb7OPA/viewform?usp=sf_link"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Feedback
              </a>
            </li>
            {userName && (
              <li className="text-white font-semibold">{userName}</li>
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

      <footer className="p-4 text-right text-gray-500 text-sm border-t border-gray-200 bg-white">
        <p>
          We are team <span className="font-semibold">Tech-NO-Logic</span>
        </p>
      </footer>
    </div>
  )
}

export default Dashboard
