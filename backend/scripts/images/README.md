# Luxand face test images

Place these files here for `luxandFaceTest.js`:

- **test-face.jpg** – Face image to register with Luxand and use for positive verification (required).
- **wrong-face.jpg** – Different person’s face for negative test (optional; script skips if missing).

You can use `.png` instead of `.jpg`; set env vars if using different names:

- `LUXAND_FACE_TEST_IMAGE` – path to test face (default: `scripts/images/test-face.jpg`)
- Script currently uses fixed filenames; rename your file to `test-face.jpg` or edit the script paths.
