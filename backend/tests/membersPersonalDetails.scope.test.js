const { createMockRes } = require('./helpers/httpMocks');

jest.mock('../models/membersPersonalDetails', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
}));
jest.mock('../models/membershipPrice', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/member', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../models/attendance', () => ({
  findOne: jest.fn(),
}));
jest.mock('../models/payment', () => ({}));

const Details = require('../models/membersPersonalDetails');
const Member = require('../models/member');
const controller = require('../controllers/membersPersonalDetailsController');

describe('Members personal details tenant scope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters getAll by manager gym and branch scope', async () => {
    const req = {
      user: { role: 'manager', gymId: 'gym-1', branchId: 'branch-1' },
    };
    const res = createMockRes();

    Member.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ _id: 'member-1' }]),
      }),
    });
    Details.find.mockResolvedValue([{ _id: 'details-1', memberId: 'member-1' }]);

    await controller.getAll(req, res);

    expect(Member.find).toHaveBeenCalledWith({ gymId: 'gym-1', branchId: 'branch-1' });
    expect(Details.find).toHaveBeenCalledWith({ memberId: { $in: ['member-1'] } });
    expect(res.statusCode).toBe(200);
  });

  it('denies getByMemberId for member from another branch', async () => {
    const req = {
      user: { role: 'manager', gymId: 'gym-1', branchId: 'branch-1' },
      params: { memberId: 'member-2' },
    };
    const res = createMockRes();

    Member.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'member-2',
          gymId: 'gym-1',
          branchId: 'branch-2',
        }),
      }),
    });

    await controller.getByMemberId(req, res);

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Access denied for this member');
  });
});
