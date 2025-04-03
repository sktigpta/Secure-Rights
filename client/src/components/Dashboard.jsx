"use client";

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { motion } from "framer-motion";
import { Shield, LogOut, Github } from "lucide-react";
import NotificationBar from "./NotificationBar";
import QueryRow from "./QueryRow";
import FetchedVideos from "./FetchedVideos";
import ProcessedVideos from "./ProcessedVideos";
import PermittedVideos from "./PermittedVideos";

const teamMembers = [
  "Shaktidhar (Team Leader)",
  "Satyam Kumar (Backend)",
  "Saurav Kumar (Frontend)",
  "Rishi (UI & UX)"
];

const Dashboard = ({ token }) => {
  const [notification, setNotification] = useState({ message: "", type: null });
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % teamMembers.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (message, type) => setNotification({ message, type });
  const clearNotification = () => setNotification({ message: "", type: null });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("authToken");
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NotificationBar message={notification.message} type={notification.type} onClose={clearNotification} />

      <header className="py-3 px-5 md:px-10 border-b border-gray-300 bg-blue-700 text-white flex items-center justify-between shadow-md">
        <Link to="/" className="text-3xl font-bold tracking-wide flex items-center gap-2">
          <Shield className="h-5 w-5 text-white" />
          <span className="text-lg font-bold">SecureRights</span>
        </Link>
        <nav>
          <ul className="flex gap-1 md:gap-2 items-center">
            <li className="hidden md:inline-block">
              <a
                className="px-2 md:px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-sm font-medium cursor-pointer"
                href="https://docs.google.com/forms/d/e/1FAIpQLSdZEqtUaM02fIbDwkcbhHuN-CSexYL9dswws5Jhm_DnPb7OPA/viewform?usp=sf_link"
                target="_blank"
                rel="noopener noreferrer"
              >
                Feedback
              </a>
            </li>
            <button
              onClick={handleLogout}
              className="px-2 md:px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/40 transition-colors text-sm font-medium cursor-pointer flex items-center justify-center"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </ul>
        </nav>
      </header>

      <main className="flex-1 p-5 flex flex-col gap-5 max-w-[1400px] mx-auto w-full">
        <QueryRow onNotification={showNotification} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <FetchedVideos onNotification={showNotification} />
          <ProcessedVideos onNotification={showNotification} />
          <PermittedVideos onNotification={showNotification} />
        </div>
      </main>

      <footer className="p-2 flex justify-end gap-3 items-center text-gray-500 text-sm border-t border-gray-300 bg-gray-50">
        <p>
          <motion.span
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.5 }}
            className="font-semibold ml-1"
          >
            {teamMembers[index]}
          </motion.span>
        </p>

        <p>
          from <span className="font-semibold">Tech-NO-Logic</span>
        </p>

        <a
          href="https://github.com/your-repo-link"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-500"
        >
          <Github size={16} />
        </a>
      </footer>
    </div>
  );
};

export default Dashboard;