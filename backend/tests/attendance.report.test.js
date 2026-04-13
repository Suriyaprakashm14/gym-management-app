const { createMockRes } = require('./helpers/httpMocks');

jest.mock('../models/attendance', () => ({
  find: jest.fn(),
}));

jest.mock('../models/member', () => ({
  find: jest.fn(),
}));

jest.mock('../models/branch', () => ({
  findOne: jest.fn(),
}));

const Attendance = require('../models/attendance');
const Member = require('../models/member');
const attendanceController = require('../controllers/attendanceController');

describe('Attendance - report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attendance summary with present and absent members', async () => {
    const req = {
      user: { role: 'manager', gymId: 'gym-1', branchId: 'branch-1' },
      query: {
        period: 'day',
        date: '2026-02-24',
      },
    };
    const res = createMockRes();

    const attendanceRecord = {
      _id: 'att-1',
      memberId: { _id: 'member-1', firstName: 'John', lastName: 'Doe', branchId: { name: 'Branch A' } },
      status: 'Present',
      authMethod: 'face',
      authData: { confidence: 99 },
      attendanceDate: new Date('2026-02-24T10:00:00.000Z'),
      location: { branchId: { name: 'Branch A' } },
    };

    Attendance.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([attendanceRecord]),
        }),
      }),
    });

    const allMembers = [
      { _id: 'member-1', firstName: 'John', lastName: 'Doe', branchId: { name: 'Branch A' } },
      { _id: 'member-2', firstName: 'Jane', lastName: 'Smith', branchId: { name: 'Branch A' } },
    ];

    Member.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(allMembers),
      }),
    });

    await attendanceController.getAttendanceReport(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.totalMembers).toBe(2);
    expect(res.body.data.summary.presentCount).toBe(1);
    expect(res.body.data.summary.absentCount).toBe(1);
    expect(Attendance.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: 'gym-1',
        'location.branchId': 'branch-1',
      })
    );
    expect(Member.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: 'gym-1',
        branchId: 'branch-1',
      })
    );
  });

  it('uses gym-wide filter for gym owner without branch query', async () => {
    const req = {
      user: { role: 'gym_owner', gymId: 'gym-1' },
      query: { period: 'day', date: '2026-02-24' },
    };
    const res = createMockRes();

    Attendance.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    Member.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      }),
    });

    await attendanceController.getAttendanceReport(req, res);

    expect(res.body.success).toBe(true);
    expect(Attendance.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: 'gym-1',
      })
    );
    expect(Attendance.find.mock.calls[0][0]['location.branchId']).toBeUndefined();
    expect(Member.find).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: 'gym-1',
      })
    );
    expect(Member.find.mock.calls[0][0].branchId).toBeUndefined();
  });
});
