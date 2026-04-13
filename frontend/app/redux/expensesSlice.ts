import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient from './axiosClient';

export interface ExpenseItem {
  _id: string;
  amount: number;
  date: string;
  category?: string | null;
  description?: string | null;
  branchId?: string | null;
  branchName?: string | null;
}

export interface ExpenseCategory {
  _id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
}

interface ExpensesState {
  list: ExpenseItem[];
  categories: ExpenseCategory[];
  loading: boolean;
  categoriesLoading: boolean;
  savingExpense: boolean;
  savingCategory: boolean;
  error: string | null;
  categoriesError: string | null;
}

const initialState: ExpensesState = {
  list: [],
  categories: [],
  loading: false,
  categoriesLoading: false,
  savingExpense: false,
  savingCategory: false,
  error: null,
  categoriesError: null,
};

function getErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.message ||
    fallback
  );
}

function normalizeExpense(raw: any): ExpenseItem {
  return {
    _id: raw?._id ?? raw?.id ?? '',
    amount: raw?.amount ?? 0,
    date: raw?.date ?? '',
    category: raw?.category ?? null,
    description: raw?.description ?? null,
    branchId: raw?.branchId ?? null,
    branchName: raw?.branchName ?? null,
  };
}

function normalizeCategory(raw: any): ExpenseCategory {
  return {
    _id: raw?._id ?? raw?.id ?? '',
    name: typeof raw?.name === 'string' ? raw.name : '',
    description: typeof raw?.description === 'string' ? raw.description : '',
    isActive: raw?.isActive !== false,
  };
}

export const fetchExpensesAsync = createAsyncThunk<
  ExpenseItem[],
  { branchId?: string } | undefined
>('expenses/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params?.branchId) query.set('branchId', params.branchId);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    const response = await axiosClient.get(`/expenses${suffix}`);
    const data = Array.isArray(response.data)
      ? response.data
      : response.data?.data ?? [];
    return Array.isArray(data) ? data.map(normalizeExpense) : [];
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, 'Failed to load expenses'));
  }
});

export const createExpenseAsync = createAsyncThunk<
  ExpenseItem,
  { amount: number; date: string; category?: string; description?: string; branchId?: string }
>('expenses/create', async (payload, { rejectWithValue }) => {
  try {
    const response = await axiosClient.post('/expenses', payload);
    const data = response.data?.data ?? response.data;
    return normalizeExpense(data);
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, 'Failed to add expense'));
  }
});

export const updateExpenseAsync = createAsyncThunk<
  ExpenseItem,
  { id: string; data: { amount?: number; date?: string; category?: string; description?: string } }
>('expenses/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const response = await axiosClient.put(`/expenses/${id}`, data);
    const payload = response.data?.data ?? response.data;
    return normalizeExpense(payload);
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, 'Failed to update expense'));
  }
});

export const deleteExpenseAsync = createAsyncThunk<string, string>(
  'expenses/delete',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/expenses/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete expense'));
    }
  }
);

export const fetchExpenseCategoriesAsync = createAsyncThunk<ExpenseCategory[]>(
  'expenses/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosClient.get('/expense-categories');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data ?? [];
      return Array.isArray(data)
        ? data.map(normalizeCategory).filter((c) => c.isActive !== false)
        : [];
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, 'Failed to load categories'));
    }
  }
);

export const createExpenseCategoryAsync = createAsyncThunk<
  ExpenseCategory,
  { name: string; description?: string }
>('expenses/createCategory', async (payload, { rejectWithValue }) => {
  try {
    const response = await axiosClient.post('/expense-categories', payload);
    const data = response.data?.data ?? response.data;
    return normalizeCategory(data);
  } catch (error: any) {
    return rejectWithValue(getErrorMessage(error, 'Failed to add category'));
  }
});

export const deleteExpenseCategoryAsync = createAsyncThunk<string, string>(
  'expenses/deleteCategory',
  async (id, { rejectWithValue }) => {
    try {
      await axiosClient.delete(`/expense-categories/${id}`);
      return id;
    } catch (error: any) {
      return rejectWithValue(getErrorMessage(error, 'Failed to delete category'));
    }
  }
);

const expensesSlice = createSlice({
  name: 'expenses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExpensesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpensesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchExpensesAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to load expenses';
      })
      .addCase(createExpenseAsync.pending, (state) => {
        state.savingExpense = true;
        state.error = null;
      })
      .addCase(createExpenseAsync.fulfilled, (state, action) => {
        state.savingExpense = false;
        state.list.unshift(action.payload);
      })
      .addCase(createExpenseAsync.rejected, (state, action) => {
        state.savingExpense = false;
        state.error = (action.payload as string) || 'Failed to add expense';
      })
      .addCase(updateExpenseAsync.pending, (state) => {
        state.savingExpense = true;
        state.error = null;
      })
      .addCase(updateExpenseAsync.fulfilled, (state, action) => {
        state.savingExpense = false;
        const index = state.list.findIndex((item) => item._id === action.payload._id);
        if (index !== -1) state.list[index] = action.payload;
      })
      .addCase(updateExpenseAsync.rejected, (state, action) => {
        state.savingExpense = false;
        state.error = (action.payload as string) || 'Failed to update expense';
      })
      .addCase(deleteExpenseAsync.fulfilled, (state, action) => {
        state.list = state.list.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteExpenseAsync.rejected, (state, action) => {
        state.error = (action.payload as string) || 'Failed to delete expense';
      })
      .addCase(fetchExpenseCategoriesAsync.pending, (state) => {
        state.categoriesLoading = true;
        state.categoriesError = null;
      })
      .addCase(fetchExpenseCategoriesAsync.fulfilled, (state, action) => {
        state.categoriesLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchExpenseCategoriesAsync.rejected, (state, action) => {
        state.categoriesLoading = false;
        state.categoriesError = (action.payload as string) || 'Failed to load categories';
      })
      .addCase(createExpenseCategoryAsync.pending, (state) => {
        state.savingCategory = true;
        state.categoriesError = null;
      })
      .addCase(createExpenseCategoryAsync.fulfilled, (state, action) => {
        state.savingCategory = false;
        state.categories.unshift(action.payload);
      })
      .addCase(createExpenseCategoryAsync.rejected, (state, action) => {
        state.savingCategory = false;
        state.categoriesError = (action.payload as string) || 'Failed to add category';
      })
      .addCase(deleteExpenseCategoryAsync.fulfilled, (state, action) => {
        state.categories = state.categories.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteExpenseCategoryAsync.rejected, (state, action) => {
        state.categoriesError = (action.payload as string) || 'Failed to delete category';
      });
  },
});

export default expensesSlice.reducer;

export const selectExpenses = (state: any): ExpenseItem[] => state.expenses?.list ?? [];
export const selectExpensesLoading = (state: any): boolean => state.expenses?.loading ?? false;
export const selectExpenseCategories = (state: any): ExpenseCategory[] => state.expenses?.categories ?? [];
export const selectExpenseCategoriesLoading = (state: any): boolean =>
  state.expenses?.categoriesLoading ?? false;
export const selectExpenseSaving = (state: any): boolean => state.expenses?.savingExpense ?? false;
export const selectExpenseCategorySaving = (state: any): boolean =>
  state.expenses?.savingCategory ?? false;
