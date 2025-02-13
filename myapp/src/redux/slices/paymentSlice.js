// paymentSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  paymentStatus: null,
  userInfo: [], // userInfo is initially an empty array
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setPaymentStatus: (state, action) => {
      state.paymentStatus = action.payload;
    },
    addUserInfo: (state, action) => {
      state.userInfo = [...state.userInfo, action.payload]; // Add new userInfo to the existing array
    },
  },
});

export const { setPaymentStatus, addUserInfo } = paymentSlice.actions;
export default paymentSlice.reducer;
