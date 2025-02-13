import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const WaitTimeDisplay = () => {
  const [countdown, setCountdown] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const eventSource = new EventSource('http://157.119.87.214:3000/waittime');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const waitTimeInSeconds = Math.floor(data.waitTime / 1000); // Convert to seconds
      setCountdown(waitTimeInSeconds);

      if (waitTimeInSeconds <= 0) {
        eventSource.close(); // Stop receiving updates
        // navigate('/'); // Redirect to homepage
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prevCountdown) => {
          if (prevCountdown === 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prevCountdown - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [countdown]);

  return (
    <div>
      <h1 style={{color:'white'}}>Countdown Timer</h1>
      {countdown !== null ? (
        <p style={{color:'white'}}>{countdown} seconds remaining</p>
      ) : (
        <p style={{color:'white'}}>Loading...</p>
      )}
    </div>
  );
};

export default WaitTimeDisplay;
