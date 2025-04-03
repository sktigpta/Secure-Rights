import axios from 'axios';
import { auth } from '../firebase/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

// Helper function for handling auth errors
const handleAuthError = (error, defaultMessage) => {
  console.error(error);
  const errorMessage = error.response?.data?.error || defaultMessage;
  return Promise.reject({
    message: errorMessage,
    requiresLogout: error.response?.status === 401
  });
};

export const registerUser = async (email, password, name) => {
  try {
    const response = await axios.post(`${API_URL}/register`, { email, password, name });
    return response.data;
  } catch (error) {
    return handleAuthError(error, 'Registration failed');
  }
};

export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('authToken', token);
    return { token };
  } catch (error) {
    return handleAuthError(error, 'Login failed');
  }
};

export const getUserDetails = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    return handleAuthError(
      error,
      'Failed to fetch user details. Please log out and try again.'
    );
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('authToken');
    console.log("User logged out successfully");
    return true;
  } catch (error) {
    return handleAuthError(error, 'Logout failed');
  }
};

export const useAuthCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const currentPath = window.location.pathname;
      
      if (user && !currentPath.startsWith('/dashboard')) {
        navigate('/dashboard');
      } else if (!user && currentPath !== '/login') {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate]);
};

// New helper for components to handle logout-aware errors
export const handleAuthErrorInComponent = (error, logoutHandler) => {
  if (error.requiresLogout) {
    return (
      <div className="auth-error">
        {error.message}
        <button onClick={logoutHandler} className="logout-button">
          Log Out Now
        </button>
      </div>
    );
  }
  return <div className="auth-error">{error.message}</div>;
};