import React, { useEffect, useState } from "react";
import { getUserDetails } from "../services/service";
import { useNavigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const token = localStorage.getItem("authToken");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("authToken");
      navigate("/login");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!token) {
        navigate("/login");
      } else {
        try {
          const userData = await getUserDetails(token);
          setUser(userData);
        } catch (err) {
          setError(err.message);
        }
      }
    };
    fetchUserDetails();
  }, [navigate, token]);

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen text-red-500">
        {error}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
