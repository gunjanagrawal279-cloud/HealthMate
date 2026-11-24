
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback
} from 'react';

import api from '../services/api';

const AuthContext = createContext(null);

// Backend errors ko readable message mein convert karo
const getErrorMessage = (error, fallback) => {
  const status = error.response?.status;
  const data = error.response?.data;

  if (data) {
    if (typeof data === 'string') {
      return data;
    }

    if (data.detail) return data.detail;

    if (data.non_field_errors?.length) {
      return data.non_field_errors[0];
    }

    const fields = [
      'username',
      'email',
      'password'
    ];

    for (const field of fields) {
      if (data[field]) {
        return Array.isArray(data[field])
          ? data[field][0]
          : String(data[field]);
      }
    }

    const firstValue = Object.values(data)[0];

    if (firstValue) {
      return Array.isArray(firstValue)
        ? firstValue[0]
        : String(firstValue);
    }
  }

  if (status === 500) {
    return 'Server error (500). Please try again later.';
  }

  if (status === 404) {
    return 'API endpoint not found (404).';
  }

  if (status === 400) {
    return 'Invalid information. Please check your details.';
  }

  if (!error.response) {
    return 'Unable to connect to the server. Check your internet connection.';
  }

  return error.message || fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Currently logged-in user load karo
  const loadUser = useCallback(async () => {
    const accessToken = localStorage.getItem('access_token');

    if (!accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to load user:', error);

      // Sirf unauthorized hone par tokens clear karo
      if (error.response?.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }

      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // LOGIN
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login/', {
        username,
        password
      });

      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error(
          'Login response did not contain authentication tokens.'
        );
      }

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);

      const meResponse = await api.get('/auth/me/');

      setUser(meResponse.data);

      return meResponse.data;

    } catch (error) {
      console.error('Login failed:', error);

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      setUser(null);

      throw new Error(
        getErrorMessage(error, 'Login failed. Please try again.')
      );
    }
  };

  // REGISTER
  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register/', {
        username,
        email,
        password
      });

      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error(
          'Registration response did not contain authentication tokens.'
        );
      }

      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);

      if (response.data.user) {
        setUser(response.data.user);
      } else {
        const meResponse = await api.get('/auth/me/');
        setUser(meResponse.data);
      }

      return response.data;

    } catch (error) {
      console.error('Registration failed:', error);

      throw new Error(
        getErrorMessage(error, 'Registration failed. Please try again.')
      );
    }
  };

  // LOGOUT
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    setUser(null);
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        loadUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider'
    );
  }

  return context;
};

export default AuthContext;
