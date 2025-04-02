import axios from 'axios';
import { auth } from '../firebase/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const API_URL = `${import.meta.env.VITE_API_URL}/auth`;

export const registerUser = async (email, password, name) => {
  try {
    const response = await axios.post(`${API_URL}/register`, { email, password, name });
    return response.data;
  } catch (error) {
    console.error("Registration Error:", error);
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
};

export const loginUser = async (email, password, navigate) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('authToken', token);
    navigate('/dashboard');
    return { token };
  } catch (error) {
    console.error("Login Error:", error);
    throw new Error(error.message || 'Login failed');
  }
};

export const getUserDetails = async (token) => {
  try {
    const response = await axios.get(`${API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Fetch User Details Error:", error);
    throw new Error(error.response?.data?.error || 'Failed to fetch user details');
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('authToken');
    console.log("User logged out successfully");
  } catch (error) {
    console.error("Logout Error:", error);
    throw new Error('Logout failed');
  }
};

export const useAuthCheck = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    });

    return unsubscribe;
  }, [navigate]);
};
