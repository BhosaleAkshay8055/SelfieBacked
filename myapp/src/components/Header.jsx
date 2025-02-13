import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import logo from '../assets/images/eyelikesystemsLogo.jpg'

const Header = () => {
  const navigate = useNavigate(); // Initialize useNavigate

  const handleNavigation = () => {
    navigate('/'); // Navigate to the main page
  };

  return (
    <div className="title">
      <img
        className="logo"
        src={logo}
        alt="logo"
        onClick={handleNavigation} // Add click handler to navigate
        style={{ cursor: 'pointer' }} // Optional: change cursor to pointer for better UX
      />
      <div className="title-text" onClick={handleNavigation} style={{ cursor: 'pointer' }}>
        <h2>Eyelike Systems</h2>
      </div>
    </div>
  );
};

export default Header;
