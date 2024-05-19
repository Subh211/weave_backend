import path from "path";
import multer, { FileFilterCallback } from "multer";

// Custom error type for better clarity
class UnsupportedFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedFileTypeError";
  }
}

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB in size max limit
  storage: multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
      cb(null, file.originalname);
    },
  }),
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (
      ext !== ".jpg" &&
      ext !== ".jpeg" &&
      ext !== ".webp" &&
      ext !== ".png" &&
      ext !== ".mp4"
    ) {
      cb(new UnsupportedFileTypeError(`Unsupported file type! ${ext}`) as any, false);
      return;
    }

    cb(null, true);
  },
});

export default upload;
