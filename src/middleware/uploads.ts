import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const uploadDir = path.join(process.cwd(), "uploads", "feed");

fs.mkdirSync(uploadDir, {
  recursive: true,
});

const storage = multer.diskStorage({

  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {

    const ext = path.extname(file.originalname);

    cb(
      null,
      `${Date.now()}-${crypto.randomUUID()}${ext}`
    );

  }

});

export const upload = multer({

  storage,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter(req, file, cb) {

    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only images are allowed"));
    }

    cb(null, true);

  }

});