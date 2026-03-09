/**
 * Face check-in test script.
 *
 * Purpose:
 * - Send a test face image to the backend attendance API to simulate a face-based check-in.
 * - Verify the Luxand + /api/attendance pipeline end to end.
 *
 * Usage:
 * 1) Place a test image on disk (use the SAME face that you enrolled with Luxand).
 * 2) Update MEMBER_ID and IMAGE_PATH below.
 * 3) From the backend folder run:
 *      node scripts/testFaceCheckin.js
 *
 * The script will log a structured trace:
 *  - start banner
 *  - memberId
 *  - request status
 *  - JSON response or error details
 */

/* eslint-disable no-console */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Backend attendance endpoint.
// Default assumes backend is running on http://localhost:5000 (see backend/.env PORT)
const API_URL =
  process.env.TEST_FACE_CHECKIN_URL ||
  `http://localhost:${process.env.PORT || 5000}/api/attendance`;

// TODO: Replace this with a real member ID from your database,
// for a member that already has a valid Luxand personId registered.
const MEMBER_ID = process.env.TEST_FACE_CHECKIN_MEMBER_ID || 'REPLACE_WITH_MEMBER_ID';

// Path to the test face image (JPEG/PNG). Use the SAME face image you used to enroll in Luxand.
const IMAGE_PATH =
  process.env.TEST_FACE_CHECKIN_IMAGE_PATH ||
  path.join(__dirname, 'test-face.jpg');

async function run() {
  console.log('===== FACE CHECK-IN TEST START =====');
  console.log('API URL :', API_URL);
  console.log('Member ID:', MEMBER_ID);
  console.log('Image   :', IMAGE_PATH);

  if (!MEMBER_ID || MEMBER_ID === '06d74a45-0de8-4daa-b44b-3fb610a915e9') {
    console.error(
      'ERROR: MEMBER_ID is not set. Set TEST_FACE_CHECKIN_MEMBER_ID in .env or edit this script.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(IMAGE_PATH)) {
    console.error('ERROR: Test image not found at path:', IMAGE_PATH);
    console.error('Place a test image there (same face used for Luxand enrollment).');
    process.exit(1);
  }

  try {
    console.log('Reading test image from disk...');
    const imageStream = fs.createReadStream(IMAGE_PATH);

    const form = new FormData();
    form.append('memberId', MEMBER_ID);
    // Field name must match Multer uploadMiddleware: upload.single("image")
    form.append('image', imageStream, path.basename(IMAGE_PATH));

    console.log('Sending image to backend...');

    const response = await axios.post(API_URL, form, {
      headers: {
        ...form.getHeaders(),
      },
      // Optional: increase timeout for slow networks
      timeout: 15000,
      validateStatus: () => true, // Let us handle non-2xx manually
    });

    console.log('Response status:', response.status);
    console.log('Response body:');
    console.log(JSON.stringify(response.data, null, 2));

    const data = response.data || {};

    if (response.status === 200 && data.success) {
      console.log('✅ Face check-in succeeded.');
      if (data.data?.confidence != null) {
        console.log('Confidence:', data.data.confidence);
      }
      return;
    }

    // Handle common error cases with friendly messages
    const errorMsg = (data && (data.error || data.message)) || 'Unknown error';
    console.log('❌ Face check-in failed.');
    console.log('Reason:', errorMsg);

    if (/no face detected/i.test(errorMsg)) {
      console.log('- Hint: Make sure the face is clearly visible and close to the camera.');
    } else if (/does not match/i.test(errorMsg)) {
      console.log('- Hint: This photo does not match the enrolled Luxand personId.');
    } else if (/member not found/i.test(errorMsg)) {
      console.log('- Hint: Check that MEMBER_ID exists in the database.');
    } else if (/membership/i.test(errorMsg) || /expired/i.test(errorMsg)) {
      console.log('- Hint: Membership may be inactive or expired.');
    } else if (/Luxand/i.test(errorMsg) || /token/i.test(errorMsg)) {
      console.log('- Hint: There may be an issue with LUXAND_TOKEN or Luxand service.');
    }
  } catch (err) {
    console.error('ERROR: Request to attendance API failed.');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Body  :', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Message:', err.message);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unexpected error in testFaceCheckin:', err);
  process.exit(1);
});

