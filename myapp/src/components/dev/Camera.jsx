import React, { useEffect, useRef } from 'react';
import config from '../config';

function Camera() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.error("Error accessing the camera: ", err);
      });
  }, []);

  const captureImage = () => {
    const context = canvasRef.current.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

    const imageDataUrl = canvasRef.current.toDataURL('image/png');

    fetch(imageDataUrl)
      .then(res => res.blob())
      .then(blob => convertToBase64(blob)) // Convert image blob to base64
      .then(base64String => {
        const base64Data = base64String.split(',')[1];

        const payload = JSON.stringify({ image: base64Data });

        return fetch(`${config.IP_ADDRESS}/match_face`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        });
      })
      .then(response => {
        if (response.ok) {
          return response.json(); 
        } else {
          return response.json().then(err => {
            throw new Error(`Failed to upload the image: ${err.detail}`);
          });
        }
      })
      .then(data => {
        console.log('Image uploaded successfully:', data);
        document.getElementById('fname').value = data.name || '';
        document.getElementById('cname').value = data.company_name || '';
        document.getElementById('phoneno').value = data.mobile_number || '';
        document.getElementById('response').value = data.message || '';
      })
      .catch(error => {
        console.error('Error:', error);
        document.getElementById('response').value = error || '';
      });
  };

  const convertToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="camera">
      <div className="cam">
        <video ref={videoRef} id="video" autoPlay></video>
        <button id="capture" onClick={captureImage} style={{ marginLeft: '5%' }}>Capture Image</button>
      </div>
      <canvas ref={canvasRef} id="canvas" width="640" height="480" style={{ display: 'none' }}></canvas>
    </div>
  );
}

export default Camera;
