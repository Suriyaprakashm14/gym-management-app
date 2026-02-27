import { configureStore } from '@reduxjs/toolkit';
import membersReducer from './membersSlice';
import paymentReducer from './paymentSlice';
import membershipPricesReducer from './membershipsSlice';

export const store = configureStore({
  reducer: {
    members: membersReducer,
    payments: paymentReducer,  // Add payment reducer here
    membershipPrices: membershipPricesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
