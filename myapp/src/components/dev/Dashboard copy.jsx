import React from 'react';
import Form from './Form';
import Camera from './Camera';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

function Dashboard() {
    const navigate = useNavigate();

    
  const handleClick =  () => {
    navigate('/admin-login');
  }

    return (
        <>
            <div className="title">
                <h2>Dashboard</h2>
            </div>
                <div className="setting-btn">
                    <button onClick={() => handleClick()}>Settings</button>
                </div>
            <div className="main">
                <Camera />
                <Form />
            </div>
        </>
    );
}

export default Dashboard;
