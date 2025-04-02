import React from 'react';
import { logoutUser } from '../services/service';
import { useNavigate } from 'react-router-dom';

function Logout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  return (
    <div className="max-w-sm mx-auto p-4 text-center">
      <h2 className="text-xl font-semibold mb-4">Are you sure you want to log out?</h2>
      <button 
        onClick={handleLogout} 
        className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}

export default Logout;
