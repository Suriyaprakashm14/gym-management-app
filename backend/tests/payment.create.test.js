const { createMockRes } = require('./helpers/httpMocks');

const mockPaymentSave = jest.fn();
const mockPaymentModel = jest.fn().mockImplementation((data) => ({
  ...data,
  save: mockPaymentSave,
}));

mockPaymentModel.find = jest.fn();
mockPaymentModel.findById = jest.fn();
mockPaymentModel.findByIdAndUpdate = jest.fn();
mockPaymentModel.findByIdAndDelete = jest.fn();

jest.mock('../models/payment', () => mockPaymentModel);
jest.mock('../models/member', () => ({
  findById: jest.fn(),
}));
jest.mock('../models/membersPersonalDetails', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/membershipPrice', () => ({
  findOne: jest.fn(),
}));

const Member = require('../models/member');
const Details = require('../models/membersPersonalDetails');
const MembershipPrice = require('../models/membershipPrice');
const paymentController = require('../controllers/paymentController');

describe('Payment - create', () => {
  beforeEach(() => {
    mockPaymentSave.mockReset();
    mockPaymentModel.mockClear();
  });

  it('creates payment and updates member paid amount', async () => {
    const req = {
      params: { branchId: 'branch-1' },
      user: { role: 'manager', branchId: 'branch-1' },
      body: { memberId: 'member-1', paidAmount: 500 },
    };
    const res = createMockRes();

    Member.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: 'member-1',
        firstName: 'John',
        lastName: 'Doe',
        branchId: 'branch-1',
        membership: { type: 'monthly' },
      }),
    });

    const detailsDoc = {
      _id: 'details-1',
      paidAmount: 100,
      totalAmount: 1000,
      save: jest.fn().mockResolvedValue(true),
    };
    Details.findOne.mockResolvedValue(detailsDoc);
    MembershipPrice.findOne.mockResolvedValue({ price: 1000 });
    mockPaymentSave.mockResolvedValue(true);

    await paymentController.create(req, res);

    expect(mockPaymentModel).toHaveBeenCalled();
    expect(detailsDoc.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
