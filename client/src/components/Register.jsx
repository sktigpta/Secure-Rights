import React, { useState } from 'react';
import { registerUser } from '../services/service';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); // Clear previous errors

    // Basic validation check
    if (!email || !password || !name) {
      setError('Please fill in all the fields.');
      return;
    }

    try {
      const data = await registerUser(email, password, name, role);
      console.log('User registered:', data);
      navigate('/login');  // Redirect to login page
    } catch (err) {
      setError(err.message); // Show error if registration fails
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        
        <h2 className="text-2xl font-semibold text-center mb-6 text-gray-800">Create an account</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500 text-white text-sm rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="name" className="block mb-2 text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters</p>
          </div>
          
          <div>
            <label htmlFor="role" className="block mb-2 text-sm font-medium text-gray-700">
              Account Type
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors appearance-none bg-white"
            >
              <option value="user">Regular User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Create Account
          </button>
          
          <div className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">
              Log in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;