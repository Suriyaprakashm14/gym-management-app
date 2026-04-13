const { createMockRes } = require('./helpers/httpMocks');

const mockMembershipPriceSave = jest.fn();
const MockMembershipPrice = jest.fn().mockImplementation((data) => ({
  ...data,
  _id: 'price-1',
  save: mockMembershipPriceSave,
}));
MockMembershipPrice.findOne = jest.fn();
MockMembershipPrice.find = jest.fn();
MockMembershipPrice.findById = jest.fn();
MockMembershipPrice.findByIdAndUpdate = jest.fn();

jest.mock('../models/membershipPrice', () => MockMembershipPrice);
jest.mock('../models/member', () => ({
  countDocuments: jest.fn(),
}));
jest.mock('../models/membersPersonalDetails', () => ({}));

const MembershipPrice = require('../models/membershipPrice');
const membershipPriceController = require('../controllers/membershipPriceController');

describe('Membership price tenant scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects create when gym context is missing', async () => {
    const req = {
      user: { role: 'manager' },
      body: { type: 'monthly', price: 1000, description: 'Monthly plan', duration: 30 },
    };
    const res = createMockRes();

    await membershipPriceController.create(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Gym context required');
  });

  it('forces getAll to query only current gym', async () => {
    const req = { user: { role: 'gym_owner', gymId: 'gym-1' } };
    const res = createMockRes();

    MembershipPrice.find.mockReturnValue({
      lean: jest.fn().mockResolvedValue([{ _id: 'p1', gymId: 'gym-1', type: 'monthly', price: 1000 }]),
    });

    const Member = require('../models/member');
    Member.countDocuments.mockResolvedValue(0);

    await membershipPriceController.getAll(req, res);

    expect(res.statusCode).toBe(200);
    expect(MembershipPrice.find).toHaveBeenCalledWith({ gymId: 'gym-1' });
  });

  it('blocks getOne when price belongs to another gym', async () => {
    const req = {
      user: { role: 'manager', gymId: 'gym-1' },
      params: { id: 'price-foreign' },
    };
    const res = createMockRes();

    MembershipPrice.findById.mockResolvedValue({
      _id: 'price-foreign',
      gymId: 'gym-2',
      type: 'monthly',
    });

    await membershipPriceController.getOne(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Not authorized/);
  });
});
