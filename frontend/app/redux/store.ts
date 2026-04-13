import { configureStore } from '@reduxjs/toolkit';
import membersReducer from './membersSlice';
import paymentReducer from './paymentSlice';
import membershipPricesReducer from './membershipsSlice';
import branchesReducer from './branchesSlice';
import expensesReducer from './expensesSlice';
import staffsReducer from './staffsSlice';
import gymReducer from './gymSlice';

export const store = configureStore({
  reducer: {
    members: membersReducer,
    payments: paymentReducer,
    membershipPrices: membershipPricesReducer,
    branches: branchesReducer,
    expenses: expensesReducer,
    staffs: staffsReducer,
    gym: gymReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
