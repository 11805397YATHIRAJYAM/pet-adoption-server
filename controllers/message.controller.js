import Conversation from '../models/Conversation.model.js';
import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import { asyncHandler, createError } from '../utils/error.js';
import { getPaginationParams, paginateResponse } from '../utils/pagination.js';
import { isUserOnline } from '../config/socket.js';

// @POST /api/messages/conversations
export const createOrGetConversation = asyncHandler(async (req, res, next) => {
  const { participantId, petId, subject } = req.body;

  const other = await User.findById(participantId);
  if (!other) return next(createError(404, 'User not found.'));

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, participantId] },
    ...(petId ? { pet: petId } : {}),
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      pet: petId || undefined,
      subject,
      unreadCount: [
        { user: req.user._id, count: 0 },
        { user: participantId, count: 0 },
      ],
    });
  }

  await conversation.populate('participants', 'name avatar role');
  await conversation.populate('pet', 'name images');

  res.status(201).json({ success: true, conversation });
});

// @GET /api/messages/conversations
export const getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
    isActive: true,
  })
    .populate('participants', 'name avatar role')
    .populate('pet', 'name images')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1 });

  const withOnline = conversations.map((conv) => {
    const convObj = conv.toObject();
    convObj.participants = convObj.participants.map((p) => ({
      ...p,
      isOnline: isUserOnline(p._id.toString()),
    }));
    const myUnread = conv.unreadCount.find((u) => u.user.toString() === req.user._id.toString());
    convObj.myUnreadCount = myUnread?.count || 0;
    return convObj;
  });

  res.json({ success: true, conversations: withOnline });
});

// @GET /api/messages/conversations/:id
export const getMessages = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const conversation = await Conversation.findById(req.params.id);
  if (!conversation) return next(createError(404, 'Conversation not found.'));

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) return next(createError(403, 'Not authorized.'));

  const [messages, total] = await Promise.all([
    Message.find({ conversation: req.params.id, isDeleted: false })
      .populate('sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Message.countDocuments({ conversation: req.params.id, isDeleted: false }),
  ]);

  // Mark messages as read
  await Message.updateMany(
    {
      conversation: req.params.id,
      'readBy.user': { $ne: req.user._id },
      sender: { $ne: req.user._id },
    },
    { $push: { readBy: { user: req.user._id } } }
  );

  // Reset unread count for this user
  await Conversation.findByIdAndUpdate(req.params.id, {
    $set: { 'unreadCount.$[elem].count': 0 },
  }, { arrayFilters: [{ 'elem.user': req.user._id }] });

  res.json({ success: true, ...paginateResponse(messages.reverse(), total, page, limit) });
});

// @POST /api/messages
export const sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId, content, type = 'text' } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return next(createError(404, 'Conversation not found.'));

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === req.user._id.toString()
  );
  if (!isParticipant) return next(createError(403, 'Not authorized.'));

  const msgData = {
    conversation: conversationId,
    sender: req.user._id,
    content,
    type,
    readBy: [{ user: req.user._id }],
  };

  if (req.file) {
    msgData.type = 'image';
    msgData.attachments = [{ url: req.file.path, publicId: req.file.filename, type: req.file.mimetype }];
  }

  const message = await Message.create(msgData);
  await message.populate('sender', 'name avatar');

  // Update conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
    $inc: {
      'unreadCount.$[elem].count': 1,
    },
  }, {
    arrayFilters: [{ 'elem.user': { $ne: req.user._id } }],
  });

  // Emit via socket
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message:receive', message);
  }

  res.status(201).json({ success: true, message });
});

// @DELETE /api/messages/:id
export const deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id);
  if (!message) return next(createError(404, 'Message not found.'));
  if (message.sender.toString() !== req.user._id.toString()) {
    return next(createError(403, 'Not authorized.'));
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  await message.save();

  res.json({ success: true, message: 'Message deleted.' });
});
