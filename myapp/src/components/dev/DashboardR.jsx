import React, { useEffect } from "react";
import { useSelector } from "react-redux";

function DashboardR() {
  const userInfo = useSelector((state) => state.payment.userInfo);

  useEffect(() => {
    console.log("userInfo:", userInfo);
  }, [userInfo]);

  return (
    <div>
      <h1>Dashboard</h1>
      {userInfo.length > 0 ? (
        userInfo.map((user, index) => (
          <div key={index}>
            <p>Name: {user.customer_name}</p>
            <p>Phone: {user.customer_phone}</p>
            <p>Email: {user.customer_email}</p>
            <p>Amount: {user.order_amount}</p>
          </div>
        ))
      ) : (
        <p>No user data available.</p>
      )}
    </div>
  );
}

export default DashboardR;
