import Notification from '../models/Notification.model.js';
import Favorite from '../models/Favorite.model.js';

export const createNotification = async (data, io = null) => {
  try {
    const notification = await Notification.create(data);

    // Emit real-time notification if socket.io instance available
    if (io) {
      const sockets = await io.fetchSockets();
      const userSocket = sockets.find(s => s.userId === data.recipient.toString());
      if (userSocket) {
        userSocket.emit('notification:receive', notification);
      }
    }

    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
  }
};

export const notifyFavoriters = async (pet, io = null) => {
  try {
    const favorites = await Favorite.find({ pet: pet._id }).select('user');
    const notifications = favorites.map((fav) => ({
      recipient: fav.user,
      type: 'favorite_pet_adopted',
      title: `${pet.name} found a home!`,
      message: `${pet.name}, one of your favorite pets, has been adopted.`,
      link: `/pets/${pet._id}`,
      data: { petId: pet._id },
    }));

    if (notifications.length) {
      await Notification.insertMany(notifications);
      if (io) {
        notifications.forEach(async (n) => {
          const sockets = await io.fetchSockets();
          const userSocket = sockets.find(s => s.userId === n.recipient.toString());
          if (userSocket) {
            userSocket.emit('notification:receive', n);
          }
        });
      }
    }
  } catch (error) {
    console.error('Notify favoriters error:', error);
  }
};
