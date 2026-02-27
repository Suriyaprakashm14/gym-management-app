const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
exports.uploadMiddleware = upload.single('image');
