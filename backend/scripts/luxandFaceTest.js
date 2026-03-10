/**
 * Luxand face lifecycle test script.
 *
 * Two modes:
 *
 * A) Member already has personId (e.g. seeded or from Luxand dashboard):
 *    Set LUXAND_FACE_TEST_MEMBER_ID to that member. Script SKIPS registration,
 *    does NOT overwrite personId, and only runs verification. Use test-face.jpg
 *    that matches the face already registered for that UUID in Luxand.
 *
 * B) Full flow (member has no personId, or SKIP_REGISTER is not set and you want fresh run):
 *    1. Register test-face.jpg with Luxand → get UUID, save to Member.personId
 *    2. Wait 15s for Luxand indexing
 *    3. Verify same image → create Attendance
 *    4. Verify wrong image → expect no match
 *
 * Run from project root:
 *   node backend/scripts/luxandFaceTest.js
 *
 * Env:
 *   - LUXAND_FACE_TEST_MEMBER_ID  member _id to use (optional)
 *   - SKIP_REGISTER=1             skip registration; only verify (use existing personId)
 *
 * Requires:
 *   - LUXAND_TOKEN, MONGODB_URI in backend/.env
 *   - backend/scripts/images/test-face.jpg (and optionally wrong-face.jpg)
 *
 * Why does Luxand return a different name (e.g. "80_Suryananthan S")?
 * Luxand search returns the best-matching face in your whole project. If the same
 * photo (or same person) was enrolled before under another name/UUID, search can
 * return that older record instead of the one you just created. Fix: delete the
 * duplicate person in Luxand dashboard, or use a photo that was never enrolled.
 */

/* eslint-disable no-console */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Member = require('../models/member');
const Attendance = require('../models/attendance');

const LUXAND_TOKEN = process.env.LUXAND_TOKEN;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/gym-management';

const MEMBER_ID = process.env.LUXAND_FACE_TEST_MEMBER_ID || 'ec10c347-846a-4878-b921-fb1c0b1e0fac';
const SKIP_REGISTER = process.env.SKIP_REGISTER === '1' || process.env.SKIP_REGISTER === 'true';

const IMAGES_DIR = path.join(__dirname, 'images');
const TEST_FACE_PATH = path.join(IMAGES_DIR, 'test-face.jpg');
const WRONG_FACE_PATH = path.join(IMAGES_DIR, 'wrong-face.jpg');

const INDEXING_DELAY_MS = Number(process.env.LUXAND_INDEX_DELAY_MS || 15000);
const VERIFY_RETRIES = Number(process.env.LUXAND_VERIFY_RETRIES || 5);
const RETRY_DELAY_MS = Number(process.env.LUXAND_RETRY_DELAY_MS || 3000);
const MIN_CONFIDENCE = 70;
const SKIP_WRONG_TEST = process.env.SKIP_WRONG_TEST === '1' || process.env.SKIP_WRONG_TEST === 'true';

// ---------------------------------------------------------------------------
// connectToMongo()
// ---------------------------------------------------------------------------
async function connectToMongo() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');
}

// ---------------------------------------------------------------------------
// searchFace(imagePath) — POST photo to Luxand, return response.data
// ---------------------------------------------------------------------------
async function searchFace(imagePath) {
  if (!LUXAND_TOKEN) {
    throw new Error('LUXAND_TOKEN is not set in .env');
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const form = new FormData();
  form.append('photo', fs.createReadStream(imagePath), path.basename(imagePath));

  const response = await axios.post('https://api.luxand.cloud/photo/search/v2', form, {
    headers: {
      token: LUXAND_TOKEN,
      ...form.getHeaders(),
    },
    timeout: 15000,
  });

  return response.data;
}

// ---------------------------------------------------------------------------
// registerFace(memberId, imagePath)
// ---------------------------------------------------------------------------
async function registerFace(memberId, imagePath) {
  if (!LUXAND_TOKEN) {
    throw new Error('LUXAND_TOKEN is not set in .env');
  }
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const member = await Member.findById(memberId);
  if (!member) {
    throw new Error(`Member not found: ${memberId}`);
  }

  console.log('Registering face with Luxand...\n');

  const form = new FormData();
  const imageBuffer = fs.readFileSync(imagePath);
  const filename = path.basename(imagePath);
  form.append('photos', imageBuffer, { filename });
  form.append('name', `${member.firstName || ''} ${member.lastName || ''}`.trim() || `Member ${memberId}`);
  form.append('store', '1');
  form.append('collections', '');
  form.append('unique', '0');

  const response = await axios.post('https://api.luxand.cloud/v2/person', form, {
    headers: {
      token: LUXAND_TOKEN,
      ...form.getHeaders(),
    },
    timeout: 15000,
  });

  const uuid = response.data && response.data.uuid;
  if (!uuid) {
    throw new Error('Luxand did not return a UUID. Response: ' + JSON.stringify(response.data));
  }

  console.log('Luxand UUID:');
  console.log(uuid + '\n');

  await Member.findByIdAndUpdate(
    memberId,
    {
      personId: uuid,
      'authMethods.faceRecognition': true,
    },
    { runValidators: false }
  );

  console.log('Member updated successfully.\n');
  return uuid;
}

// ---------------------------------------------------------------------------
// waitForLuxandIndexing()
// ---------------------------------------------------------------------------
async function waitForLuxandIndexing() {
  const seconds = Math.round(INDEXING_DELAY_MS / 1000);
  console.log(`Waiting ${seconds} seconds for Luxand indexing...\n`);
  await new Promise((resolve) => setTimeout(resolve, INDEXING_DELAY_MS));
}

// ---------------------------------------------------------------------------
// Normalize Luxand response to array of matches
// ---------------------------------------------------------------------------
function toMatchesArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.matches)) return data.matches;
  return [];
}

// ---------------------------------------------------------------------------
// createAttendance(member, match)
// ---------------------------------------------------------------------------
async function createAttendance(member, match) {
  const confidence = match.confidence != null ? match.confidence : (match.probability != null ? match.probability * 100 : undefined);
  await Attendance.create({
    memberId: member._id,
    gymId: member.gymId,
    attendanceDate: new Date(),
    status: 'Present',
    authMethod: 'face_recognition',
    authData: {
      confidence,
      deviceInfo: {
        deviceIP: 'luxand-face-test',
        deviceModel: 'Luxand Face Test Script',
        deviceType: 'camera',
      },
    },
    location: {
      branchId: member.branchId,
      deviceId: 'luxand_face_test',
    },
  });
}

// ---------------------------------------------------------------------------
// verifyFace(memberId, imagePath) — retry up to 5 times, match by uuid + confidence > 70
// ---------------------------------------------------------------------------
async function verifyFace(memberId, imagePath) {
  const member = await Member.findById(memberId);
  if (!member) {
    throw new Error(`Member not found: ${memberId}`);
  }
  if (!member.personId) {
    throw new Error('Member has no personId. Run registerFace first.');
  }

  let matches = [];
  for (let attempt = 1; attempt <= VERIFY_RETRIES; attempt++) {
    console.log(`Verification attempt ${attempt}...`);
    const data = await searchFace(imagePath);
    matches = toMatchesArray(data);

    if (matches.length > 0) {
      break;
    }
    if (attempt < VERIFY_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  // Full debug: print Luxand response before matching
  console.log('Luxand raw response:');
  console.log(JSON.stringify(matches, null, 2));
  console.log('');

  // Luxand v2 returns "probability" (0-1); some APIs return "confidence" (0-100)
  const match = matches.find((f) => {
    if (f.uuid !== member.personId) return false;
    const conf = Number(f.confidence);
    const prob = Number(f.probability);
    if (conf > 0 && conf <= 100) return conf > MIN_CONFIDENCE;
    if (prob >= 0 && prob <= 1) return prob > MIN_CONFIDENCE / 100;
    return true; // uuid match only if no score
  });

  if (match) {
    const score = match.confidence != null ? match.confidence : (match.probability != null ? match.probability * 100 : null);
    console.log('Face verification success.');
    console.log('Confidence:', score != null ? score : 'N/A');
    await createAttendance(member, match);
    console.log('Attendance recorded.\n');
    return true;
  }

  // Luxand returned a different person than our member — same face enrolled under another UUID
  if (matches.length > 0) {
    const other = matches[0];
    console.log('Luxand returned a DIFFERENT person than this member:');
    console.log('  Member personId (expected):', member.personId);
    console.log('  Luxand returned uuid:       ', other.uuid, other.name ? `(${other.name})` : '');
    console.log('The same face is in your Luxand project under multiple persons. Remove the other');
    console.log('person (e.g. "' + (other.name || other.uuid) + '") from Luxand dashboard or use a unique photo.\n');
  }
  console.log('Face verification failed.\n');
  return false;
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------
async function main() {
  console.log('===== LUXAND FACE TEST =====\n');
  console.log('Member ID:', MEMBER_ID);
  if (SKIP_REGISTER) console.log('Mode: verify-only (SKIP_REGISTER=1 or member already has personId)\n');

  if (!LUXAND_TOKEN) {
    console.error('ERROR: LUXAND_TOKEN is not set. Add it to backend/.env');
    process.exit(1);
  }

  if (!fs.existsSync(TEST_FACE_PATH)) {
    console.error('ERROR: Test image not found:', TEST_FACE_PATH);
    console.error('Create backend/scripts/images/ and add test-face.jpg (face to register).');
    process.exit(1);
  }

  await connectToMongo();

  const member = await Member.findById(MEMBER_ID);
  if (!member) {
    console.error('ERROR: Member not found:', MEMBER_ID);
    process.exit(1);
  }

  const skipRegister = SKIP_REGISTER || (member.personId && member.personId.trim() !== '');
  if (skipRegister) {
    console.log('Member already has personId:', member.personId);
    console.log('Skipping registration (verify-only mode).\n');
  }

  try {
    if (!skipRegister) {
      // Step 1: Register face
      await registerFace(MEMBER_ID, TEST_FACE_PATH);
      // Step 2: Wait for Luxand indexing
      await waitForLuxandIndexing();
    } else {
      console.log('Waiting 2 seconds before verify...\n');
      await new Promise((r) => setTimeout(r, 2000));
    }

    // Step 3: Verify same image → expect match
    console.log('Verifying with same image...\n');
    const sameMatch = await verifyFace(MEMBER_ID, TEST_FACE_PATH);
    if (!sameMatch) {
      console.error('Unexpected: same image should have matched.');
    }

    // Step 4: Verify different image → expect no match
    if (SKIP_WRONG_TEST) {
      console.log('Skipping wrong-face test (SKIP_WRONG_TEST=1).\n');
    } else {
      console.log('Testing wrong image...\n');
      if (fs.existsSync(WRONG_FACE_PATH)) {
        const wrongMatch = await verifyFace(MEMBER_ID, WRONG_FACE_PATH);
        if (wrongMatch) {
          console.error('Unexpected: wrong image should not have matched.');
        }
      } else {
        console.log('Skipping wrong-face test (file not found):', WRONG_FACE_PATH);
      }
    }
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }

  console.log('\n===== LUXAND FACE TEST DONE =====');
}

main().catch((err) => {
  console.error('Script failed:', err.message);
  if (err.response && err.response.data) {
    console.error('Response data:', err.response.data);
  }
  process.exit(1);
});
