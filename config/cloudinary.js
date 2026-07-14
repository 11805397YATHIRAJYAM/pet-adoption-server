import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage for pet images
const petImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pet-adoption/pets',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }],
  },
});

// Storage for pet videos
const petVideoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pet-adoption/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'avi', 'webm'],
  },
});

// Storage for avatar images
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pet-adoption/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  },
});

// Storage for documents
const documentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pet-adoption/documents',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
  },
});

// Storage for review images
const reviewImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'pet-adoption/reviews',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }],
  },
});

export const uploadPetImages = multer({
  storage: petImageStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

export const uploadPetVideo = multer({
  storage: petVideoStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'), false);
  },
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

export const uploadDocuments = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadReviewImages = multer({
  storage: reviewImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
  },
});

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    console.error('Cloudinary delete error:', error);
  }
};

export default cloudinary;
