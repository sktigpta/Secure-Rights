import React, { useEffect, useState } from 'react';
import { getUserDetails } from '../services/service';
import { useNavigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('authToken');

  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!token) {
        navigate('/login');
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
    return <div className="text-red-500">{error}</div>;
  }

  if (!user) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
