# Membership Flow — Code + Line-by-Line Explanation

This document follows your exact format preference:
- **Code first**
- **Explanation right below**
- Written in very simple language

I covered the full membership flow files that control creation, renewal, expiry, validation, scheduler, and migration.

---

## 1) `backend/utils/istTime.js`

```js
L1:const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
L2:const DAY_MS = 24 * 60 * 60 * 1000;
L3:
L4:function todayMidnightIST() {
L5:  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
L6:  return new Date(
L7:    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS
L8:  );
L9:}
L10:
L11:function ninetyDaysAgoIST() {
L12:  return new Date(todayMidnightIST().getTime() - 90 * DAY_MS);
L13:}
L14:
L15:module.exports = {
L16:  IST_OFFSET_MS,
L17:  todayMidnightIST,
L18:  ninetyDaysAgoIST,
L19:};
```

### Explanation (line by line)
- **L1**: Stores India time difference from UTC in milliseconds (+5:30).
- **L2**: Stores one day in milliseconds.
- **L3**: Empty line for readability.
- **L4**: Starts a helper function that gives IST midnight.
- **L5**: Converts current UTC time into IST clock time.
- **L6**: Starts returning a Date object.
- **L7**: Builds UTC midnight for IST day, then shifts back so Mongo comparisons are correct.
- **L8**: Closes return calculation.
- **L9**: Ends function.
- **L10**: Empty line.
- **L11**: Starts helper for “90 days ago in IST”.
- **L12**: Subtracts 90 days from IST midnight.
- **L13**: Ends function.
- **L14**: Empty line.
- **L15**: Starts exported object.
- **L16**: Exports IST offset constant.
- **L17**: Exports IST midnight function.
- **L18**: Exports 90-days-ago function.
- **L19**: Ends exports.

---

## 2) `backend/models/member.js` (membership/expiry block)

```js
L65:  membership: {
L66:    type: {
L67:      type: String,
L68:      trim: true,
L69:      default: 'basic'
L70:    },
L71:    startDate: {
L72:      type: Date,
L73:      default: Date.now
L74:    },
L75:    endDate: Date,
L76:    isActive: {
L77:      type: Boolean,
L78:      default: true
L79:    },
L80:    autoRenew: {
L81:      type: Boolean,
L82:      default: false
L83:    }
L84:  },
L92:  status: {
L93:    type: String,
L94:    enum: ['active', 'inactive', 'long term inactive', 'suspended'],
L95:    default: 'active'
L96:  },
L151:// Virtual for membership status
L152:memberSchema.virtual('isMembershipActive').get(function() {
L153:  if (!this.membership?.isActive) return false;
L154:  if (!this.membership?.startDate || !this.membership?.endDate) return false;
L155:  const today = todayMidnightIST();
L156:  const start = new Date(this.membership.startDate);
L157:  const end = new Date(this.membership.endDate);
L158:  return start <= today && end >= today;
L159:});
L161:// Batch expiry sync using Member.membership as the only source of truth.
L162:memberSchema.statics.checkAndUpdateExpiredMemberships = async function() {
L163:  try {
L164:    const today = todayMidnightIST();
L165:    const ninetyDaysAgo = ninetyDaysAgoIST();
L166:    const asOfLocalDate = today.toISOString().slice(0, 10);
L168:    const expiredMembers = await this.find({
L169:      role: 'member',
L170:      status: { $nin: ['suspended', 'inactive', 'long term inactive'] },
L171:      'membership.isActive': true,
L172:      'membership.endDate': { $exists: true, $ne: null, $lt: today },
L173:    }).select('_id membership.endDate');
L175:    const inactiveIds = [];
L176:    const longTermInactiveIds = [];
L177:    for (const member of expiredMembers) {
L178:      const endDate = member?.membership?.endDate ? new Date(member.membership.endDate) : null;
L179:      if (endDate && endDate < ninetyDaysAgo) {
L180:        longTermInactiveIds.push(member._id);
L181:      } else {
L182:        inactiveIds.push(member._id);
L183:      }
L184:    }
L186:    if (inactiveIds.length > 0) {
L187:      await this.updateMany(
L188:        { _id: { $in: inactiveIds } },
L189:        { $set: { 'membership.isActive': false, status: 'inactive' } }
L190:      );
L191:    }
L192:    if (longTermInactiveIds.length > 0) {
L193:      await this.updateMany(
L194:        { _id: { $in: longTermInactiveIds } },
L195:        { $set: { 'membership.isActive': false, status: 'long term inactive' } }
L196:      );
L197:    }
L199:    return {
L200:      success: true,
L201:      asOfLocalDate,
L202:      inactiveCount: inactiveIds.length,
L203:      longTermInactiveCount: longTermInactiveIds.length,
L204:      message: `Marked ${inactiveIds.length} inactive and ${longTermInactiveIds.length} long term inactive`,
L205:    };
L206:  } catch (error) {
L207:    console.error('Error checking expired memberships:', error);
L208:    throw error;
L209:  }
L210:};
L257:memberSchema.statics.findActiveMembers = function() {
L258:  return this.find({ 
L259:    isActive: true, 
L260:    status: 'active',
L261:    'membership.isActive': true 
L262:  });
L263:};
L265:memberSchema.statics.findExpiredMembers = function() {
L266:  return this.find({
L267:    status: { $in: ['inactive', 'long term inactive'] }
L268:  });
L269:};
L271:memberSchema.index({ role: 1, status: 1, 'membership.endDate': 1 });
```

### Explanation (line by line)
- **L65**: Starts membership object (single source of truth).
- **L66**: Starts membership type field config.
- **L67**: Value type is string.
- **L68**: Remove extra spaces from plan name.
- **L69**: Default plan label if none provided.
- **L70**: Ends type field config.
- **L71**: Starts start date field config.
- **L72**: Date type.
- **L73**: Default start time is now.
- **L74**: Ends start date config.
- **L75**: End date field.
- **L76**: Starts active flag config.
- **L77**: Boolean type.
- **L78**: Default true.
- **L79**: Ends active flag config.
- **L80**: Starts auto-renew flag config.
- **L81**: Boolean type.
- **L82**: Default false.
- **L83**: Ends auto-renew config.
- **L84**: Ends membership object.
- **L92**: Starts status config.
- **L93**: Status is string.
- **L94**: Only these status values allowed.
- **L95**: Default active.
- **L96**: Ends status config.
- **L151**: Comment: virtual field begins.
- **L152**: Defines computed field `isMembershipActive`.
- **L153**: If `membership.isActive` false, return false.
- **L154**: If dates missing, treat as inactive.
- **L155**: Get IST midnight once.
- **L156**: Parse start date.
- **L157**: Parse end date.
- **L158**: Active only when start<=today<=end.
- **L159**: Ends virtual.
- **L161**: Comment for new batch logic.
- **L162**: Defines expiry batch static method.
- **L163**: Starts try block.
- **L164**: Get IST today midnight.
- **L165**: Get IST 90-days-ago boundary.
- **L166**: String date for logs/response.
- **L168**: Query members that are truly expired candidates.
- **L169**: Only paying members, not trainers.
- **L170**: Skip already-final states.
- **L171**: Only currently active membership rows.
- **L172**: End date exists and is before today.
- **L173**: Fetch only id + endDate for speed.
- **L175**: Array for recent-expired members.
- **L176**: Array for >90-day expired members.
- **L177**: Loop over expired members.
- **L178**: Safely parse each end date.
- **L179**: Check if very old expiry.
- **L180**: Put into long-term group.
- **L181**: Else branch.
- **L182**: Put into normal inactive group.
- **L183**: Ends else.
- **L184**: Ends loop.
- **L186**: If inactive group has records.
- **L187**: Bulk update those members.
- **L188**: Match only those ids.
- **L189**: Set inactive status + membership inactive.
- **L190**: Ends update call.
- **L191**: Ends if.
- **L192**: If long-term group has records.
- **L193**: Bulk update those members.
- **L194**: Match long-term ids.
- **L195**: Set long-term inactive + membership inactive.
- **L196**: Ends update call.
- **L197**: Ends if.
- **L199**: Return summary object.
- **L200**: Batch success flag.
- **L201**: Date used for calculation.
- **L202**: Count of inactive updates.
- **L203**: Count of long-term updates.
- **L204**: Human-readable message.
- **L205**: Ends return.
- **L206**: Catch errors.
- **L207**: Log error.
- **L208**: Re-throw so caller knows it failed.
- **L209**: Ends catch.
- **L210**: Ends static method.
- **L257**: Starts helper query for active members.
- **L258**: Returns DB query object.
- **L259**: Top-level active only.
- **L260**: Status must be active.
- **L261**: Membership active flag must be true.
- **L262**: Ends query object.
- **L263**: Ends helper.
- **L265**: Starts helper for expired members.
- **L266**: Returns DB query.
- **L267**: Expired means inactive or long term inactive.
- **L268**: Ends query.
- **L269**: Ends helper.
- **L271**: Adds compound index for batch scan performance.

---

## 3) `backend/middleware/membershipValidation.js` (core decision engine)

```js
L1:const Member = require('../models/member');
L2:const { todayMidnightIST } = require('../utils/istTime');
L4:function validateMemberAccess(member) {
L5:  if (!member) {
L6:    return { isValid: false, status: 404, error: 'Member not found', message: 'The specified member does not exist' };
L7:  }
L8:  if (!member.isActive) {
L9:    return { ... };
L16:  }
L17:  if (member.status === 'suspended') {
L18:    return { ... };
L25:  }
L26:  if (!member.membership || !member.membership.startDate || !member.membership.endDate) {
L27:    return { ... };
L34:  }
L35:  if (!member.membership.isActive) {
L36:    return { ... };
L50:  }
L52:  const today = todayMidnightIST();
L53:  const startDate = new Date(member.membership.startDate);
L54:  const endDate = new Date(member.membership.endDate);
L55:  if (startDate > today) {
L56:    return { ... };
L69:  }
L70:  if (endDate < today) {
L71:    return { ... };
L86:  }
L88:  return { isValid: true, member };
L89:}
L95:const validateMembership = async (req, res, next) => {
L97:    const { memberId } = req.body;
L99:    if (!memberId) {
L100:      return res.status(400).json({ ... });
L104:    }
L107:    const member = await Member.findById(memberId);
L109:    if (!member) {
L110:      return res.status(404).json({ ... });
L114:    }
L116:    const membershipResult = validateMemberAccess(member);
L117:    if (!membershipResult.isValid) {
L118:      return res.status(membershipResult.status || 403).json(membershipResult);
L119:    }
L122:    const isGymFrozen = await member.isFrozen();
L123:    if (isGymFrozen) {
L124:      return res.status(403).json({ ... });
L133:    }
L136:    req.validatedMember = member;
L137:    next();
L146:};
L152:const validateMembershipForFaceRecognition = async (req, res, next) => {
L157:    const member = req.recognizedMember;
L159:    if (!member) {
L160:      return res.status(400).json({ ... });
L164:    }
L166:    const membershipResult = validateMemberAccess(member);
L167:    if (!membershipResult.isValid) {
L168:      return res.status(membershipResult.status || 403).json(membershipResult);
L169:    }
L172:    const isGymFrozen = await member.isFrozen();
L173:    if (isGymFrozen) {
L174:      return res.status(403).json({ ... });
L183:    }
L186:    req.validatedMember = member;
L187:    next();
L196:};
L201:const checkMembershipStatus = async (memberId) => {
L203:    const member = await Member.findById(memberId);
L205:    const membershipResult = validateMemberAccess(member);
L206:    if (!membershipResult.isValid) return membershipResult;
L208:    const isGymFrozen = await member.isFrozen();
L209:    if (isGymFrozen) {
L210:      return { ... };
L220:    }
L222:    return {
L223:      isValid: true,
L224:      member: member
L225:    };
L235:};
L237:module.exports = {
L238:  validateMemberAccess,
L239:  validateMembership,
L240:  validateMembershipForFaceRecognition,
L241:  checkMembershipStatus
L242:};
```

### Explanation (line by line)
- **L1-L2**: Import member model and IST utility.
- **L4**: Core pure function starts.
- **L5-L7**: If member missing, return 404-like result.
- **L8-L16**: If top-level account inactive, block access.
- **L17-L25**: If suspended, block access.
- **L26-L34**: If no complete membership dates, block.
- **L35-L50**: If membership flag is inactive, block.
- **L52-L54**: Compute normalized dates for safe compare.
- **L55-L69**: If start date is in future, block as “not started”.
- **L70-L86**: If end date is before today, block as “expired”.
- **L88-L89**: If all checks pass, return valid.
- **L95-L146**: Body-member middleware wrapper (reads `req.body.memberId`, runs core check, then gym freeze check, then passes `req.validatedMember`).
- **L152-L196**: Face-recognition wrapper (same core check, but source is `req.recognizedMember`).
- **L201-L235**: Helper for controllers (returns plain object instead of sending HTTP directly).
- **L237-L242**: Exports all four functions.

---

## 4) `backend/controllers/memberController.js` — `renew()` + `checkExpiredMemberships()`

```js
L516:// Renew membership for a member (expired or active): new plan/period, payment, update Details + Member
L517:exports.renew = async (req, res) => {
L518:  try {
L519:    const allowedRoles = ['gym_owner', 'manager'];
L520:    if (!allowedRoles.includes(req.user.role)) {
L521:      return res.status(403).json({ error: 'Access denied. Only gym_owner or manager can renew memberships.' });
L522:    }
L524:    const memberId = req.params.id;
L525:    const { membership, paidAmount, membershipStartDate: startDateBody } = req.body;
L527:    const membershipTrimmed = membership ? String(membership).trim() : '';
L528:    if (!membershipTrimmed) {
L529:      return res.status(400).json({ error: 'Membership type is required' });
L530:    }
L532:    const member = await Member.findById(memberId);
L533:    if (!member) return res.status(404).json({ error: 'Member not found' });
L535:    if (req.user.role === 'manager' && member.branchId.toString() !== req.user.branchId.toString()) {
L536:      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
L537:    }
L538:    if (req.user.role === 'gym_owner' && member.gymId !== req.user.gymId) {
L539:      return res.status(403).json({ error: 'Access denied: Not authorized for this member' });
L540:    }
L542:    const typeRegex = new RegExp(`^\s*${membershipTrimmed.replace(/[.*+?^${}()|[\]\]/g, '\\$&')}\s*$`, 'i');
L543:    let priceDoc = member.gymId
L544:      ? await MembershipPrice.findOne({ type: { $regex: typeRegex }, gymId: member.gymId, isActive: { $ne: false } })
L545:      : null;
L546:    if (!priceDoc) priceDoc = await MembershipPrice.findOne({ type: { $regex: typeRegex } });
L547:    if (!priceDoc) {
L548:      return res.status(400).json({ error: `Membership type '${membershipTrimmed}' not found` });
L549:    }
L551:    const durationDays = priceDoc.duration || 30;
L552:    let membershipStartDate;
L553:    if (startDateBody) {
L554:      membershipStartDate = new Date(startDateBody);
L555:      if (!Number.isNaN(membershipStartDate.getTime())) {
L556:        membershipStartDate.setHours(0, 0, 0, 0);
L557:      } else {
L558:        membershipStartDate = new Date();
L559:        membershipStartDate.setHours(0, 0, 0, 0);
L560:      }
L561:    } else {
L562:      membershipStartDate = new Date();
L563:      membershipStartDate.setHours(0, 0, 0, 0);
L564:    }
L565:    const membershipEndDate = new Date(membershipStartDate);
L566:    membershipEndDate.setDate(membershipEndDate.getDate() + durationDays);
L568:    const newTotal = priceDoc.price;
L569:    const paid = Math.max(0, Number(paidAmount) || 0);
L571:    if (paid > newTotal) {
L572:      return res.status(400).json({
L573:        error: 'Amount exceeds maximum for selected plan',
L574:        message: `Paid amount (₹${paid}) cannot exceed the maximum for this plan (₹${newTotal}).`,
L575:        maxAmount: newTotal
L576:      });
L577:    }
L579:    let details = await Details.findOne({ memberId });
L580:    if (!details) {
L581:      details = new Details({
L582:        memberId,
L583:        branchId: member.branchId,
L584:        totalAmount: newTotal,
L585:        paidAmount: paid,
L586:      });
L587:      await details.save();
L588:    } else {
L589:      details.totalAmount = (details.totalAmount || 0) + newTotal;
L590:      details.paidAmount = (details.paidAmount || 0) + paid;
L591:      await details.save();
L592:    }
L594:    if (paid > 0 && member.branchId) {
L595:      try {
L596:        const payment = new Payment({
L597:          memberId: String(memberId),
L598:          branchId: String(member.branchId),
L599:          name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member',
L600:          detailsId: String(details._id),
L601:          membership: membershipTrimmed,
L602:          totalAmount: newTotal,
L603:          paidAmount: paid,
L604:        });
L605:        await payment.save();
L606:      } catch (paymentErr) {
L607:        console.error('Failed to create renewal payment record:', paymentErr);
L608:      }
L609:    }
L612:    const now = new Date();
L613:    const periodHasStarted = membershipStartDate <= now;
L614:    await Member.findByIdAndUpdate(memberId, {
L615:      'membership.type': membershipTrimmed,
L616:      'membership.startDate': membershipStartDate,
L617:      'membership.endDate': membershipEndDate,
L618:      'membership.isActive': !!periodHasStarted,
L619:      status: periodHasStarted ? 'active' : 'inactive',
L620:    });
L622:    res.status(200).json({
L623:      success: true,
L624:      message: 'Membership renewed successfully',
L625:      data: {
L626:        membership: membershipTrimmed,
L627:        membershipEndDate,
L628:        paidAmount: paid,
L629:      },
L630:    });
L631:  } catch (err) {
L632:    console.error('Renew error:', err);
L633:    res.status(400).json({ error: err.message || 'Failed to renew membership' });
L634:  }
L635:};
L637:// Check and update expired memberships
L638:exports.checkExpiredMemberships = async (req, res) => {
L639:  try {
L641:    const allowedRoles = ['gym_owner'];
L642:    if (!allowedRoles.includes(req.user.role)) {
L643:      return res.status(403).json({ error: "Access denied. Only gym_owner can check expired memberships." });
L644:    }
L646:    const result = await Member.checkAndUpdateExpiredMemberships();
L647:    res.json(result);
L648:  } catch (err) {
L649:    console.error('Error checking expired memberships:', err);
L650:    res.status(500).json({ error: err.message });
L651:  }
L652:};
```

### Explanation (line by line)
- **L516**: Comment describes renew purpose.
- **L517-L522**: Start function and enforce only owner/manager can renew.
- **L524-L530**: Read member id + body, sanitize membership type, reject empty type.
- **L532-L540**: Load member and enforce access by branch/gym.
- **L542-L549**: Find plan in membership price table (gym-specific first), reject if missing.
- **L551-L566**: Compute start and end dates (no quantity/multi-period logic anymore).
- **L568-L577**: Compute total and paid amount, block overpayment.
- **L579-L592**: Update or create details billing totals only.
- **L594-L609**: If payment happened, create payment transaction row.
- **L612-L620**: Update `Member.membership` as source of truth and set status.
- **L622-L630**: Return success payload.
- **L631-L634**: Error handling.
- **L637-L652**: Admin-trigger endpoint for running expiry batch manually.

---

## 5) `backend/controllers/membersPersonalDetailsController.js` — create membership binding

```js
L8:exports.create = async (req, res) => {
L9:  try {
L10:    const { membership, memberId } = req.body;
L11:    let totalAmount = 0;
L12:    let priceDoc = null;
L14:    if (membership) {
L15:      const typeTrimmed = String(membership).trim();
L16:      if (!typeTrimmed) {
L17:        return res.status(400).json({ error: "Membership type is required" });
L18:      }
L19:      const typeRegex = new RegExp(`^\s*${typeTrimmed.replace(/[.*+?^${}()|[\]\]/g, '\\$&')}\s*$`, 'i');
L20:      const memberForPrice = await Member.findById(memberId).select('gymId').lean();
L21:      const gymId = memberForPrice?.gymId || null;
L22:      priceDoc = await MembershipPrice.findOne(
L23:        gymId ? { type: { $regex: typeRegex }, gymId } : { type: { $regex: typeRegex } }
L24:      );
L25:      if (!priceDoc) {
L26:        priceDoc = await MembershipPrice.findOne({ type: { $regex: typeRegex } });
L27:      }
L28:      if (priceDoc) {
L29:        totalAmount = priceDoc.price;
L30:      } else {
L31:        return res.status(400).json({ error: `Membership type '${typeTrimmed}' not found` });
L32:      }
L33:    } else {
L34:      return res.status(400).json({ error: "Membership type is required" });
L35:    }
L38:    const member = await Member.findById(memberId);
L39:    if (!member) {
L40:      return res.status(404).json({ error: 'Member not found' });
L41:    }
L44:    const lastAttendance = await Attendance.findOne({ 
L45:      memberId: memberId, 
L46:      status: 'Present' 
L47:    }).sort({ attendanceDate: -1 });
L50:    let calculatedAge = null;
L51:    if (req.body.dateOfBirth) {
L52:      const today = new Date();
L53:      let birthDate;
L56:      if (typeof req.body.dateOfBirth === 'string') {
L58:        if (req.body.dateOfBirth.length === 8 && /^\d{8}$/.test(req.body.dateOfBirth)) {
L59:          const day = req.body.dateOfBirth.substring(0, 2);
L60:          const month = req.body.dateOfBirth.substring(2, 4);
L61:          const year = req.body.dateOfBirth.substring(4, 8);
L62:          birthDate = new Date(`${year}-${month}-${day}`);
L63:        } else {
L65:          birthDate = new Date(req.body.dateOfBirth);
L66:        }
L67:      } else {
L68:        birthDate = new Date(req.body.dateOfBirth);
L69:      }
L72:      if (!isNaN(birthDate.getTime())) {
L73:        let age = today.getFullYear() - birthDate.getFullYear();
L74:        const monthDiff = today.getMonth() - birthDate.getMonth();
L76:        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
L77:          age--;
L78:        }
L79:        calculatedAge = age;
L80:      }
L81:    }
L83:    const durationDays = priceDoc ? priceDoc.duration : 30;
L85:    let membershipStartDate = null;
L86:    let membershipEndDate = null;
L87:    if (membership && priceDoc) {
L88:      let periodStart;
L89:      if (req.body.membershipStartDate) {
L90:        periodStart = new Date(req.body.membershipStartDate);
L91:        if (!Number.isNaN(periodStart.getTime())) {
L92:          periodStart.setHours(0, 0, 0, 0);
L93:        } else {
L94:          periodStart = new Date();
L95:          periodStart.setHours(0, 0, 0, 0);
L96:        }
L97:      } else {
L98:        periodStart = new Date();
L99:        periodStart.setHours(0, 0, 0, 0);
L100:      }
L101:      const periodEnd = new Date(periodStart);
L102:      periodEnd.setDate(periodEnd.getDate() + durationDays);
L103:      membershipStartDate = new Date(periodStart);
L104:      membershipEndDate = new Date(periodEnd);
L105:    }
L107:    const totalAmountForQuantity = totalAmount;
L108:    const initialPaidAmount = Number(req.body.paidAmount) || 0;
L110:    const membershipToSave = membership ? String(membership).trim() : req.body.membership;
L111:    const details = new Details({
L112:      ...req.body,
L113:      membership: membershipToSave,
L114:      branchId: member.branchId,
L115:      totalAmount: totalAmountForQuantity,
L116:      paidAmount: initialPaidAmount,
L117:      last_visit: lastAttendance ? lastAttendance.attendanceDate : null,
L118:      age: calculatedAge,
L119:    });
L121:    await details.save();
L124:    if (initialPaidAmount > 0 && member.branchId && membershipToSave) {
L125:      try {
L126:        const payment = new Payment({
L127:          memberId: String(memberId),
L128:          branchId: String(member.branchId),
L129:          name: `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Member',
L130:          detailsId: String(details._id),
L131:          membership: membershipToSave,
L132:          totalAmount: priceDoc ? priceDoc.price : totalAmount,
L133:          paidAmount: initialPaidAmount,
L134:        });
L135:        await payment.save();
L136:      } catch (paymentErr) {
L137:        console.error('Failed to create initial payment record for revenue:', paymentErr);
L139:      }
L140:    }
L142:    if (priceDoc && membershipStartDate && membershipEndDate) {
L143:      await Member.findByIdAndUpdate(memberId, {
L144:        'membership.type': membershipToSave,
L145:        'membership.startDate': membershipStartDate,
L146:        'membership.endDate': membershipEndDate,
L147:        'membership.isActive': true,
L148:        status: 'active'
L149:      });
L150:    }
L152:    res.status(201).json(details);
L153:  } catch (err) {
L154:    res.status(400).json({ error: err.message });
L155:  }
L156:};
```

### Explanation (line by line)
- **L8-L12**: Start create function and init pricing placeholders.
- **L14-L35**: Validate membership type and load matching price.
- **L38-L41**: Ensure member exists.
- **L44-L47**: Pull latest attendance for `last_visit`.
- **L50-L81**: Parse DOB safely and compute age.
- **L83-L105**: Compute one start date + one end date for membership.
- **L107-L119**: Build details document (billing + personal info).
- **L121**: Save details.
- **L124-L140**: Create initial payment record when paid amount > 0.
- **L142-L150**: Write source-of-truth membership fields onto Member.
- **L152-L156**: Return created details or error.

---

## 6) `backend/index.js` — scheduler lifecycle

```js
L180:    if (mongoose.connection.readyState !== 1) {
L181:      console.warn('Skipping membership expiry check: MongoDB is not connected');
L182:      return;
L183:    }
L184:    console.log('Running membership expiry check (calendar-day sweep)...');
L185:    const result = await Member.checkAndUpdateExpiredMemberships();
L186:    const day = result.asOfLocalDate ? ` as of local date ${result.asOfLocalDate}` : '';
L187:    console.log(`Membership expiry check completed:${day}`, result.message);
L188:  } catch (error) {
L189:    console.error('Error in scheduled membership expiry check:', error);
L190:  }
L191:}
L197:const MEMBERSHIP_EXPIRY_INTERVAL_MS = 4 * 60 * 60 * 1000;
L200:async function startServer() {
L201:  try {
L202:    await mongoose.connect(MONGODB_URI, {
L203:      serverSelectionTimeoutMS: 10000,
L204:    });
L205:    console.log('Connected to MongoDB');
L206:  } catch (error) {
L207:    console.error('MongoDB connection failed:', error.message);
L208:    process.exit(1);
L209:  }
L211:  await tokenBlacklist.init();
L213:  await checkExpiredMemberships();
L215:  app.listen(port, () => {
L216:    console.log(`App listening at http://localhost:${port}`);
L217:    console.log('Membership expiry check scheduled every 4 hours (startup sync already completed)');
L218:  });
L220:  setInterval(checkExpiredMemberships, MEMBERSHIP_EXPIRY_INTERVAL_MS);
L221:}
L223:startServer().catch((err) => {
L224:  console.error('Server start error:', err);
L225:  process.exit(1);
L226:});
```

### Explanation (line by line)
- **L180-L183**: If DB not connected, skip safely.
- **L184-L187**: Run expiry batch and log summary.
- **L188-L190**: Catch and log batch errors.
- **L191**: End helper function.
- **L197**: 4-hour interval constant.
- **L200-L209**: Start server function and connect DB.
- **L211**: Init token blacklist before serving traffic.
- **L213**: Run expiry sync once before first request.
- **L215-L218**: Start HTTP server and log readiness.
- **L220**: Schedule recurring expiry every 4 hours.
- **L221**: End start function.
- **L223-L226**: Run start function and fail-fast on fatal error.

---

## 7) `backend/scripts/migrate-membership-dates.js`

```js
L1:/* eslint-disable no-console */
L2:require('dotenv').config();
L3:const mongoose = require('mongoose');
L4:const { getMongoUri } = require('../config/env');
L5:const Member = require('../models/member');
L6:const Details = require('../models/membersPersonalDetails');
L8:async function run() {
L9:  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 });
L10:  console.log('Connected to MongoDB');
L12:  const detailsWithPeriods = await Details.find({
L13:    subscriptionPeriods: { $exists: true, $type: 'array', $ne: [] },
L14:  }).lean();
L16:  let migrated = 0;
L17:  for (const details of detailsWithPeriods) {
L18:    const periods = (details.subscriptionPeriods || []).filter((p) => p?.startDate && p?.endDate);
L19:    if (periods.length === 0) continue;
L20:    periods.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
L21:    const startDate = new Date(periods[0].startDate);
L22:    const endDate = new Date(periods[periods.length - 1].endDate);
L23:    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) continue;
L25:    await Member.findByIdAndUpdate(details.memberId, {
L26:      'membership.startDate': startDate,
L27:      'membership.endDate': endDate,
L28:    });
L29:    migrated += 1;
L30:  }
L32:  const expiryResult = await Member.checkAndUpdateExpiredMemberships();
L34:  console.log({ migrated, expiryResult });
L35:  await mongoose.disconnect();
L36:}
L38:run().catch(async (err) => {
L39:  console.error('Migration failed:', err);
L40:  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
L41:  process.exit(1);
L42:});
```

### Explanation (line by line)
- **L1**: Allow console logs in migration script.
- **L2-L6**: Load env and import DB/models.
- **L8**: Start migration function.
- **L9-L10**: Connect DB and log.
- **L12-L14**: Read old rows with `subscriptionPeriods`.
- **L16**: Counter for migrated rows.
- **L17-L30**: For each old row, derive first start + last end and copy to `Member.membership`.
- **L32**: Run new expiry batch after migration.
- **L34**: Print migration summary.
- **L35-L36**: Disconnect and end.
- **L38-L42**: Catch errors, disconnect, exit non-zero.

---

## End-to-end story (kid version)

1. **Admin creates/renews membership** → dates and status are written to `Member.membership`.
2. **Member tries to enter gym** → middleware checks active/suspended/date window.
3. **Every 4 hours + startup** → expiry batch marks old memberships inactive/long-term inactive.
4. **Billing** lives in `MembersPersonalDetails` + `Payment`, but **membership truth** lives in `Member` only.

That is the clean flow now.
