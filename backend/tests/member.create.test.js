const { createMockRes } = require('./helpers/httpMocks');

const mockSave = jest.fn();

const mockMemberModel = jest.fn().mockImplementation((data) => ({
  ...data,
  save: mockSave,
}));

jest.mock('../models/member', () => mockMemberModel);

const memberController = require('../controllers/memberController');

describe('Member - create', () => {
  beforeEach(() => {
    mockSave.mockReset();
    mockMemberModel.mockClear();
  });

  it('creates member for manager in same branch', async () => {
    const req = {
      user: {
        role: 'manager',
        branchId: 'branch-1',
        gymId: 'gym-1',
      },
      body: {
        firstName: 'John',
        lastName: 'Doe',
        role: 'member',
        branchId: 'branch-1',
        email: 'john@member.com',
      },
      file: undefined,
    };
    const res = createMockRes();

    mockSave.mockResolvedValue({
      _id: 'member-1',
      firstName: 'John',
      lastName: 'Doe',
      branchId: 'branch-1',
      gymId: 'gym-1',
      role: 'member',
    });

    await memberController.create(req, res);

    expect(mockMemberModel).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.member._id).toBe('member-1');
  });
});
