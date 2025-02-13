import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import config from '../config';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${config.IP_ADDRESS}/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const responseData = await response.json();

      if (response.ok) {
        // Navigate to the dashboard page after successful login
        navigate('/register');
      } else {
        setErrorMessage(responseData.message || 'Invalid username or password');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage('An error occurred. Please try again later.');
    }
  };

  return (
    <div className="main" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: '100px', marginTop: '2%' }}>
      <div className="info">
        <div className="login-title">
          <h2>Admin Login</h2>
        </div><br></br><br></br>

        <div className="login-form">
          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="fname">Name:</label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              <input
                type="text"
                id="fname"
                name="fname"
                placeholder="Enter username here"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div><br></br>
            <div className="form-group">
              <label htmlFor="password">Password:</label>&nbsp;&nbsp;
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter user password here"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div><br></br>
            <div className="form-group">
              <input className='loginBtn' type="submit" value="Login" />
            </div>
          </form>
          {errorMessage && (
            <div id="errorMessage" style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
