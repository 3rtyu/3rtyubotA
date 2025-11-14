const { addBalance } = require('../utils/currency');
const AFK_CHANNEL_ID = '1425141446679461980'; // AFKチャンネルID
const joinTimes = new Map();

module.exports = (oldState, newState) => {
  const userId = newState.id;

  // AFKチャンネルに移動した場合は記録を削除
  if (newState.channelId === AFK_CHANNEL_ID) {
    joinTimes.delete(userId);
    return;
  }

  // 通話に参加（AFK以外）
  if (!oldState.channelId && newState.channelId && newState.channelId !== AFK_CHANNEL_ID) {
    joinTimes.set(userId, Date.now());
  }

  // 通話から退出（AFK以外）
  if (oldState.channelId && !newState.channelId && oldState.channelId !== AFK_CHANNEL_ID) {
    const joinTime = joinTimes.get(userId);
    if (joinTime) {
      const durationMs = Date.now() - joinTime;
      const durationMinutes = Math.floor(durationMs / 60000); // 分単位
      const earned = durationMinutes;

      if (earned > 0) {
        addBalance(userId, earned);
        console.log(`${userId} が ${earned} はっぱを獲得しました！`);
      }

      joinTimes.delete(userId);
    }
  }
};
