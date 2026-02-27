const { createMockRes } = require('./helpers/httpMocks');

jest.mock('../models/attendance', () => ({
  find: jest.fn(),
}));

jest.mock('../models/member', () => ({
  find: jest.fn(),
}));

const Attendance = require('../models/attendance');
const Member = require('../models/member');
const attendanceController = require('../controllers/attendanceController');

describe('Attendance - report', () => {
  it('returns attendance summary with present and absent members', async () => {
    const req = {
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
  });
});
