import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // --------------------------------------------------
  // Get currently logged-in user
  // --------------------------------------------------
  const loadUser = async () => {
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

      // Invalid/expired session
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // Run once when app starts
  // --------------------------------------------------
  useEffect(() => {
    loadUser();
  }, []);

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login/', {
        username,
        password,
      });

      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error(
          'Login response did not contain authentication tokens.'
        );
      }

      // Save tokens first
      localStorage.setItem(
        'access_token',
        accessToken
      );

      localStorage.setItem(
        'refresh_token',
        refreshToken
      );

      // Get actual user information
      const meResponse = await api.get('/auth/me/');

      setUser(meResponse.data);

      return meResponse.data;

    } catch (error) {
      console.error('Login failed:', error);

      // Do not keep broken tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      let message = 'Login failed. Please try again.';

      if (error.response?.data) {
        const data = error.response.data;

        if (data.detail) {
          message = data.detail;
        } else if (data.non_field_errors?.length) {
          message = data.non_field_errors[0];
        } else if (data.username?.length) {
          message = data.username[0];
        } else if (data.password?.length) {
          message = data.password[0];
        }
      } else if (error.message) {
        message = error.message;
      }

      throw new Error(message);
    }
  };

  // --------------------------------------------------
  // REGISTER
  // --------------------------------------------------
  const register = async (
    username,
    email,
    password
  ) => {
    try {
      const response = await api.post(
        '/auth/register/',
        {
          username,
          email,
          password,
        }
      );

      const accessToken = response.data.access;
      const refreshToken = response.data.refresh;

      if (!accessToken || !refreshToken) {
        throw new Error(
          'Registration response did not contain authentication tokens.'
        );
      }

      localStorage.setItem(
        'access_token',
        accessToken
      );

      localStorage.setItem(
        'refresh_token',
        refreshToken
      );

      // Backend registration already returns user
      if (response.data.user) {
        setUser(response.data.user);
      } else {
        const meResponse = await api.get('/auth/me/');
        setUser(meResponse.data);
      }

      return response.data;

    } catch (error) {
      console.error('Registration failed:', error);

      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      let message = 'Registration failed. Please try again.';

      if (error.response?.data) {
        const data = error.response.data;

        if (data.username?.length) {
          message = data.username[0];
        } else if (data.email?.length) {
          message = data.email[0];
        } else if (data.password?.length) {
          message = data.password[0];
        } else if (data.detail) {
          message = data.detail;
        } else if (data.non_field_errors?.length) {
          message = data.non_field_errors[0];
        }
      } else if (error.message) {
        message = error.message;
      }

      throw new Error(message);
    }
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    setUser(null);
  };

  // --------------------------------------------------
  // AUTH STATUS
  // --------------------------------------------------
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
        loadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// --------------------------------------------------
// Custom hook
// --------------------------------------------------
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