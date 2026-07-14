import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
};

export const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('token', accessToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const clearTokenCookies = (res) => {
  res.cookie('token', '', { maxAge: 1 });
  res.cookie('refreshToken', '', { maxAge: 1 });
};

export const sendTokenResponse = (user, statusCode, res) => {
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  setTokenCookies(res, accessToken, refreshToken);

  const userData = user.toObject ? user.toObject() : { ...user };
  delete userData.password;

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: userData,
  });
};
