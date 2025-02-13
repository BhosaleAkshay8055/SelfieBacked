import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import "../assets/dashboard.css";
import html2canvas from "html2canvas"; // Import html2canvas
import { useSelector } from "react-redux";

function DashboardR() {
  const paymentStatus = useSelector((state) => state.payment.paymentStatus);
  const userInfo = useSelector((state) => state.payment.userInfo); // Use userInfo array from Redux state

  console.log("Payment Status:", paymentStatus);
  console.log("User Info:", userInfo);

  const videoRef = useRef(null);
  const cameraContainerRef = useRef(null); // Ref to capture the entire screen

  useEffect(() => {
    async function getCameraStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera: ", err);
      }
    }

    getCameraStream();
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0); // Track the current image index

  useEffect(() => {
    console.log("Updated userInfo:", userInfo);
    if (userInfo.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;

          // If we've gone through all user info, restart from 0
          if (nextIndex >= userInfo.length) {
            return 0; // Restart from the first user
          }

          return nextIndex; // Continue to the next user
        });
      }, 5000); // Show each user's info for 5 seconds

      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [userInfo]);

  return (
    <div className="camera-container" ref={cameraContainerRef}>
      {" "}
      {/* Reference the container for screenshot */}
      {/* Video element for the camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-feed"
        style={{
          backgroundColor: "black", // Black background as fallback
          transform: "scaleX(-1)", // Flip the video horizontally to remove mirror effect
        }}
      />
      {/* Text overlay on top of the video */}
      {userInfo.length > 0 ? (
        <>
          <div
            style={{
              position: "absolute",
              top: "78%", // Adjust the position as needed
              left: "50%",
              transform: "translateX(-50%)", // Center text horizontally
              color: "red", // Text color
              fontSize: "24px", // Text size
              fontWeight: "bold", // Bold text
              zIndex: 2, // Make sure the text is on top of the video
            }}
          >
            {userInfo[currentIndex].customer_name} गणपती बाप्पा मोरया
          </div>

          <img
            src={userInfo[currentIndex].base64String} // Show the current user's image
            alt="Received Image"
            className="corner-image"
            style={{
              backgroundColor: "white",
            }}
          />
        </>
      ) : (
        <img
          src="https://via.placeholder.com/100" // Placeholder image
          alt="Corner Image"
          className="corner-image"
          style={{
            backgroundColor: "white",
          }}
        />
      )}
    </div>
  );
}

export default DashboardR;
