import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import { createError } from '../utils/error.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next(createError(401, 'Authentication required. Please log in.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return next(createError(401, 'User no longer exists.'));
    }

    if (user.isSuspended) {
      return next(createError(403, `Account suspended: ${user.suspendedReason || 'Contact support.'}`));
    }

    if (!user.isActive) {
      return next(createError(401, 'Account deactivated.'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError(401, 'Invalid token.'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token expired. Please log in again.'));
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        createError(403, `Role '${req.user.role}' is not authorized to access this resource.`)
      );
    }
    next();
  };
};

// Optional auth — doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && !user.isSuspended && user.isActive) {
        req.user = user;
      }
    }
    next();
  } catch {
    next();
  }
};

export const requireEmailVerification = (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return next(createError(403, 'Please verify your email address first.'));
  }
  next();
};
