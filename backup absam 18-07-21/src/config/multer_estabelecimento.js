import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import aws from 'aws-sdk';
import multerS3 from 'multer-s3';
import 'dotenv/config.js';

const __dirname = path.resolve();

const storageTypes = {
  s3: multerS3({
    s3: new aws.S3(),
    bucket: process.env.BUCKET_NAME_ESTAB,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read",
    key: (req, file, cb) => {
      crypto.randomBytes(16, (err, hash) => {
        if (err) cb(err);

        const fileName = `${hash.toString("hex")}-${file.originalname}`;

        cb(null, fileName);
      });
    }
  })
};


export default {
    dest: path.resolve(__dirname, "..", "..", "tmp", "uploads"),
    storage: storageTypes['s3'],
    limits: {
      fileSize: 0.5 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        "image/jpeg",
        "image/pjpeg",
        "image/png"
      ];
  
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type."));
      }
    }
  };
