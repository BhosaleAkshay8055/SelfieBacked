import React, { useState, useRef } from "react";
// import { useNavigate } from 'react-router-dom';
import config from "../config";
////////////////////////////////////////////////
import axios from "axios";
import { load } from "@cashfreepayments/cashfree-js";
import Header from "./Header";
/////////////////////////////////////////////////
import { useDispatch, useSelector } from "react-redux";
import { setPaymentStatus, addUserInfo } from "../redux/slices/paymentSlice";

const SentFormData = () => {
  // booking functionality states start -------------------------

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availability, setAvailability] = useState(null);
  const [message, setMessage] = useState("");
  const [isPastTime, setIsPastTime] = useState(false);
  // booking functionality states end ------------------------

  // show to user image is captured or not states start
  const [isImageVisible, setIsImageVisible] = useState(false); // Controls image visibility
  const [isImageCanceled, setIsImageCanceled] = useState(false); // To handle the cancel behavior
  // show to user image is captured or not states end

  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.payment.userInfo);

  // Other state variables
  var payload2 = 0;

  let cashfree;

  let insitialzeSDK = async function () {
    cashfree = await load({
      // mode: "sandbox",           // for localhost uncomment this line
      mode: "production",       // on live server uncomment this line
    });
  };

  insitialzeSDK();
  var orderId = "";
  var paymentStatus = "";
  var customer_phone = "";
  var customer_name = "";
  var customer_email = "";
  // order_amount: form.order_amount.value,
  var order_amount = "";
  var base64String = "";
  var user_selected_time;
  var user_selected_date;

  const [imageDataUrl, setImageDataUrl] = useState("");
  const [isImageCaptured, setIsImageCaptured] = useState(false);
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  // const navigate = useNavigate();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const formRef = useRef(null);
  const submitBtnRef = useRef(null);

  // Access the camera
  React.useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing the camera: ", err);
      });
  }, []);

  // Capture the image from the video stream
  const handleCapture = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas) {
      
      // Ensure canvas matches the video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/png");
      setImageDataUrl(dataUrl);
      setIsImageCaptured(true);

      setIsImageVisible(true); // Show the captured image
      setIsImageCanceled(false); // Reset the cancel state

      checkFormCompletion();
    }
  };

  // Check if the submit button should be enabled
  const checkFormCompletion = () => {
    const form = formRef.current;
    if (form) {
      const formFields = [...form.elements].filter(
        (el) => el.type !== "submit"
      );
      const allFieldsFilled = formFields.every(
        (field) => field.value.trim() !== ""
      );
      const formComplete = allFieldsFilled && isImageCaptured;

      setIsFormComplete(formComplete);
    }
  };

  // Convert the image data URL to base64
  const convertToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    setLoading(true);
    setErrorMessage("");

    try {
      const blob = await fetch(imageDataUrl).then((res) => res.blob());
      const base64Data = await convertToBase64(blob);

      const form = formRef.current;
      const payload = {
        customer_name: form.fname.value,
        customer_phone: form.mno.value, // sending as array, ensure backend expects this
        // customer_email: form.customer_email.value,
        customer_email: "abc@gmail.com",
        // order_amount: form.order_amount.value,
        order_amount: form.order_amount.value,
        base64String: base64Data,
        user_selected_date: form.date.value,
        user_selected_time: form.time.value,
      };

      payload2 = {
        customer_name: form.fname.value,
        customer_phone: form.mno.value, // sending as array, ensure backend expects this
        // customer_email: form.customer_email.value,
        customer_email: "abc@gmail.com",
        // order_amount: form.order_amount.value,
        order_amount: form.order_amount.value,
        base64String: base64Data,
        user_selected_date: form.date.value,
        user_selected_time: form.time.value,
      };

      console.log("payload: ", payload);

      customer_name = form.fname.value;
      customer_phone = form.mno.value;
      customer_email = "abc@gmail.com";
      order_amount = form.order_amount.value;
      base64String = base64Data;
      user_selected_date = form.date.value;
      user_selected_time = form.time.value;

      // setUserInfo(payload); // for save data in database

      // Correct axios post call, pass payload as second argument
      const response = await axios.post(
        `${config.IP_ADDRESS}/payment`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 100000,   //commet this line on local server and uncomment on live server
        }
      );
      // console.log("Response:", response.data); // axios automatically parses the response

      if (response.data && response.data.payment_session_id) {
        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
        console.log(response.data.payment_session_id);
        console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
        return response.data;
      }

      // Clear form after successful submission
      form.reset();
      setImageDataUrl("");
      setIsImageCaptured(false);
      setIsFormComplete(false);
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage(
        error.message || "An error occurred. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async () => {
    try {
      // First axios call to verify the payment
      const verifyResponse = await axios.post(`${config.IP_ADDRESS}/verify`, {
        orderId,
      });

      paymentStatus = verifyResponse;

      // Function to handle payment based on status
      const handlePayments = async (paymentStatus) => {
        console.log(
          "?????????????????????????????: payment status: ",
          paymentStatus.data
        );
        // for (const payment of paymentStatus) {
        if (paymentStatus.data === "SUCCESS") {
          dispatch(setPaymentStatus("SUCCESS"));
          dispatch(addUserInfo(payload2));

          let a = 0;
          // console.log(
          //   `Payment successful`
          // );

          try {
            // Second axios call to add data to the database
            const addDataResponse = await axios.post(
              `${config.IP_ADDRESS}/addDataInDatabase`,
              {
                order_amount,
                customer_phone,
                customer_name,
                customer_email,
                base64String,
                user_selected_time,
                user_selected_date,
              }
            );
            console.log("Added to database:", addDataResponse.data);
            var showTime = addDataResponse.data;
            console.log("showTime: ", showTime);
            if (addDataResponse.status === 201) {
              alert(
                `🎉 Your image will be displayed on the screen at ${showTime.user.user_selected_time}  🎉`,
                {
                  style: {
                    color: "green",
                    fontSize: "16px",
                    textAlign: "center",
                    margin: "10px",
                  },
                }
              );
            }
          } catch (dbError) {
            // Handle the error if the user is not added to the database
            console.error("Error adding user to the database:", dbError);
            // alert(
            //   "An error occurred while adding the user to the database. Please try again."
            // );
          }
        }
        // else if (payment.payment_status === "PENDING") {
        //   console.log(
        //     `Payment pending with Payment ID: ${payment.cf_payment_id}`
        //   );
        //   // Handle pending payment here if needed
        // }
        // }
      };

      // Call handlePayments with the payment status
      handlePayments(paymentStatus);
    } catch (error) {
      console.error("Error during payment verification:", error);
      alert("An error occurred while verifying payment. Please try again.");
    }
  };

  const handleClick222 = async (event) => {
    event.preventDefault();
    let data = await handleSubmit(event);

    let sessionId = data.payment_session_id;
    orderId = data.order_id;

    if (sessionId) {
      console.log("#############################: ", sessionId);
      let checkoutOptions = {
        paymentSessionId: sessionId,
        redirectTarget: "_modal",
      };

      cashfree.checkout(checkoutOptions).then((res) => {
        console.log("payment initialized");

        verifyPayment(orderId);
      });
    }
  };

  // functions for book functionality start --------------------------------------------------------------
  const checkIfPastTime = (selectedDate, selectedTime) => {
    const now = new Date();
    const [selectedYear, selectedMonth, selectedDay] = selectedDate
      .split("-")
      .map(Number);
    const [selectedHour, selectedMinute] = selectedTime.split(":").map(Number);

    const selectedDateTime = new Date(
      selectedYear,
      selectedMonth - 1,
      selectedDay,
      selectedHour,
      selectedMinute
    );
    setIsPastTime(selectedDateTime <= now);
  };

  const checkAvailability = async (selectedDate, selectedTime) => {
    try {
      const response = await axios.get(
        `${config.IP_ADDRESS}/check-availability`,
        {
          params: {
            user_selected_date: selectedDate,
            user_selected_time: selectedTime,
          },
        }
      );

      const { available, userCount } = response.data;
      console.log(
        "checkAvailability response data: ",
        available,
        +" " + userCount
      );
      if (available) {
        setAvailability(true);
      } else {
        setAvailability(false);
        setMessage("This slot is fully booked. Please choose another one.");
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      // setMessage("An error occurred while checking availability.");
    }
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setDate(selectedDate);
    if (time) {
      checkAvailability(selectedDate, time);
    }
  };

  const handleTimeChange = (e) => {
    const selectedTime = e.target.value;
    setTime(selectedTime);
    if (date) {
      // console.log("handleTimeChange: " + 'date: ' + date + ' selectedTime: ' + selectedTime)
      checkAvailability(date, selectedTime);
    }
    checkIfPastTime(date, selectedTime);
  };
  // functions for book functionality end --------------------------------------------------------------

  // functions for resume video
  // Handle the cancel button click to restart video
  const handleCancel = () => {
    setIsImageVisible(false); // Hide the captured image
    setIsImageCaptured(false); // Allow capturing a new image
    setIsImageCanceled(true); // Track that the image was canceled
    const video = videoRef.current;
    if (video && video.srcObject) {
      video.srcObject.getTracks().forEach((track) => track.stop()); // Stop current video stream
    }
    // Restart the video feed after cancellation
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("Error accessing the camera: ", err);
      });
  };

  return (
    <>
      <Header />
      <div className="main">
        <div className="camera">
          <>
            {isImageVisible && !isImageCanceled == true ? (
              <>
                {/* <div> */}
                  <img
                    src={imageDataUrl}
                    alt="Captured"
                    className="img-captured"
                  />
                  <button onClick={handleCancel} className="cancel-button">
                    &#10006;
                  </button>
              </>
            ) : (
              <>
                <div className="cam">
                  <video
                    ref={videoRef}
                    autoPlay
                    style={{
                      transform: "scaleX(-1)", // Flip the video horizontally to remove mirror effect
                    }}
                  ></video>
                </div>
                <div className="btn">
                  <button
                    onClick={handleCapture}
                    style={{ marginLeft: "5%", marginBottom: "2%" }}
                  >
                    Take Selfie
                  </button>
                </div>
              </>
            )}{" "}
          </>

          <canvas
            ref={canvasRef}
            style={{
              display: isImageVisible && !isImageCanceled ? "none" : "none", 
              // marginLeft: "10%",
              // Hide canvas when image is visible and not canceled></canvas>
            }}
          ></canvas>

          {isImageCaptured && (
            <p className="showText">Image captured sucessfully</p>
          )}
        </div>
        <div style={{}}>
          <div className="info">
            <div className="form">
              <form
                ref={formRef}
                id="dataForm"
                onChange={checkFormCompletion}
                onSubmit={(event) => handleClick222(event)}
              >
                <label htmlFor="fname">Name</label>
                <br />
                <br />
                <input
                  type="text"
                  id="fname"
                  name="fname"
                  placeholder="Enter name here"
                />
                <br />
                <br />
                <label htmlFor="mno">Whatsapp Number</label>
                <br />
                <br />
                <input
                  id="mno"
                  name="mno"
                  type="tel"
                  placeholder="Enter mobile number here"
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  maxLength="10"
                />
                <br />
                <br />
                {/* <label htmlFor="customer_email">Email</label><br /><br />
                            <input type="enail" id="customer_email" name="customer_email" placeholder="Enter email here" /><br /><br /> */}
                <label htmlFor="order_amount">Amount</label>
                <br />
                <br />
                <input
                  type="text"
                  id="order_amount"
                  name="order_amount"
                  value="1"
                  readOnly
                />
                <br />
                <br />
                <label htmlFor="date">Select Date:</label>
                <br />
                <br />
                <input
                  type="date"
                  id="date"
                  name="date"
                  onChange={handleDateChange}
                  required
                />
                <br />
                <br />
                <label htmlFor="time">Select Time:</label>
                <br />
                <br />
                <input
                  type="time"
                  id="time"
                  name="time"
                  onChange={handleTimeChange}
                  required
                />
                <br />
                <br />
                {loading && <div id="loader"></div>}
                {isPastTime && (
                  <p style={{ color: "white" }}>
                    The selected time has already passed. Please choose a future
                    time.
                  </p>
                )}
                {message && <p>{message}</p>}
                <input
                  className="registerBtn"
                  type="submit"
                  value="Pay Now"
                  ref={submitBtnRef}
                  disabled={!isFormComplete || isPastTime || !availability}
                  style={{
                    backgroundColor:
                      isFormComplete && !isPastTime && availability
                        ? "green"
                        : "gray",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    marginTop: "5%",
                    cursor:
                      isFormComplete && !isPastTime && availability
                        ? "pointer"
                        : "not-allowed",
                  }}
                />
              </form>
              {errorMessage && (
                <div id="message" style={{ color: "red" }}>
                  {errorMessage}
                </div>
              )}
            </div>
          </div>
          <div className="powered">
            Powered by{" "}
            <a
              href="https://muksrobotics.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="custom-link"
            >
              Muks Robotics
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default SentFormData;
