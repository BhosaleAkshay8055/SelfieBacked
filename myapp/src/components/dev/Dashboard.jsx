import React, { useEffect, useRef, useState } from "react";
import config from "../config";
import '../assets/dashboard.css'
import html2canvas from "html2canvas"; // Import html2canvas
import { useSelector } from "react-redux";

function Dashboard() {
  
  const paymentStatus = useSelector((state) => state.payment.paymentStatus);
  const userInfo = useSelector((state) => state.payment.userInfo);
  
  console.log('Payment Status:', paymentStatus);
  console.log('User Info:', userInfo);
  
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

  const [imageDataArray, setImageDataArray] = useState([]); // Store all imageData in an array
  const [currentIndex, setCurrentIndex] = useState(0); // Track the current image index

  useEffect(() => {
    console.log("sent waittime");
    console.log("Attempting WebSocket connection...");
    const socket = new WebSocket(`${config.IP_ADDRESS}`); // Connect to WebSocket server

    // Log when the WebSocket connection is open
    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      const receivedData = JSON.parse(event.data);
      console.log("Base64 Image String: ", receivedData.customer_name);

      // Add received image data to the array
      setImageDataArray((prevArray) => {
        const updatedArray = [...prevArray, receivedData];

        // Calculate how long it will take for the new image to be displayed
        const currentImageIndex = currentIndex; // The current image index on the DOM
        const remainingImagesInCycle =
          updatedArray.length - currentImageIndex - 1;
        const currentWaitTime = remainingImagesInCycle * 5000; // Wait time based on 5 seconds per image

        // Send WebSocket response back with the calculated wait time
        socket.send(
          JSON.stringify({
            message: "Image received",
            waitTime: currentWaitTime, // Time in milliseconds
            customer_name: receivedData.customer_name,
          })
        );

        return updatedArray;
      });
    };

    return () => {
      socket.close(); // Cleanup on component unmount
    };
  }, []); // Listen for changes in currentIndex

  useEffect(() => {
    if (imageDataArray.length > 0) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;

          // If we've gone through all images, restart from 0
          if (nextIndex >= imageDataArray.length) {
            return 0; // Restart from the first image
          }

          return nextIndex; // Continue to the next image
        });
      }, 5000); // Show each image for 5 seconds

      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [imageDataArray]);

  // Capture screenshot and send to backend
  // useEffect to cycle through images and take screenshot when the latest one is displayed
  useEffect(() => {
    if (imageDataArray.length > 0) {
      console.log("@@@@@@@@@@@@@@@@@@: ", imageDataArray.length);
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const newIndex = (prevIndex + 1) % imageDataArray.length;

          // Check if the new index corresponds to the last element (latest image) and if the screenshot hasn't been sent yet
          // if (newIndex === imageDataArray.length - 1 && !imageDataArray[newIndex].screenshotSent) {
          if (!imageDataArray[newIndex].screenshotSent) {
            // Take screenshot only when displaying the latest image for the first time
            requestAnimationFrame(() => {
              html2canvas(cameraContainerRef.current).then((canvas) => {
                const screenshotBase64 = canvas.toDataURL("image/png"); // Get screenshot in base64 format

                console.log("screenshotBase64: ", screenshotBase64);

                // Send the screenshot to the backend
                fetch(`${config.BACKEND_API}/upload`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    screenshot: screenshotBase64, // Send the base64 image
                    customer_name: imageDataArray[newIndex].customer_name, // Send the latest customer name
                  }),
                })
                  .then((response) => response.json())
                  .then((data) =>
                    console.log("Screenshot sent successfully: ", data)
                  )
                  .catch((error) =>
                    console.error("Error sending screenshot: ", error)
                  );

                // Update the array to mark the screenshot as sent for this user
                setImageDataArray((prevArray) => {
                  const updatedArray = [...prevArray];
                  updatedArray[newIndex] = {
                    ...updatedArray[newIndex],
                    screenshotSent: true, // Mark screenshot as sent
                  };
                  return updatedArray;
                });
              });
            });
          }

          return newIndex;
        });
      }, 5000); // Cycle through images every 5 seconds

      return () => clearInterval(interval); // Cleanup interval on unmount
    }
  }, [imageDataArray]);

  console.log("111111111111111111111111111111111111: ", imageDataArray.length);

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
      {imageDataArray.length > 0 ? (
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
            {imageDataArray[currentIndex].customer_name} गणपती बाप्पा मोरया
          </div>

          <img
            src={imageDataArray[currentIndex].base64String} // Show the current image
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

export default Dashboard;
