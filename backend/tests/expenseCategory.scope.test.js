const { createMockRes } = require('./helpers/httpMocks');

jest.mock('../models/expenseCategory', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
}));

const ExpenseCategory = require('../models/expenseCategory');
const expenseCategoryController = require('../controllers/expenseCategoryController');

describe('Expense category tenant scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects list when gym context is missing', async () => {
    const req = {
      user: { role: 'manager' },
    };
    const res = createMockRes();

    await expenseCategoryController.list(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Gym context required');
  });

  it('applies gym filter in list', async () => {
    const req = {
      user: { role: 'gym_owner', gymId: 'gym-1' },
    };
    const res = createMockRes();

    ExpenseCategory.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });

    await expenseCategoryController.list(req, res);

    expect(res.statusCode).toBe(200);
    expect(ExpenseCategory.find).toHaveBeenCalledWith({ gymId: 'gym-1' });
  });

  it('blocks update for category from another gym', async () => {
    const req = {
      user: { role: 'manager', gymId: 'gym-1' },
      params: { id: 'cat-2' },
      body: { name: 'Updated' },
    };
    const res = createMockRes();

    ExpenseCategory.findById.mockResolvedValue({
      _id: 'cat-2',
      gymId: 'gym-2',
      name: 'Other gym category',
      save: jest.fn(),
    });

    await expenseCategoryController.update(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Not authorized for this category');
  });
});
