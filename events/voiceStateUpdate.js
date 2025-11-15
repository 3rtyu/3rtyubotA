// events/voiceStateUpdate.js
const { addBalance } = require('../utils/currency');
const AFK_CHANNEL_ID = '1425141446679461980'; // AFKチャンネルID
const joinTimes = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const userId = newState.member?.user?.id || oldState.member?.user?.id;
    if (!userId) return;

    // 通話に参加（AFK以外）
    if (!oldState.channelId && newState.channelId && newState.channelId !== AFK_CHANNEL_ID) {
      joinTimes.set(userId, Date.now());
      console.log(`${userId} が通話に参加しました`);
    }

    // 通話から退出
    if (oldState.channelId && !newState.channelId) {
      const joinTime = joinTimes.get(userId);
      if (joinTime) {
        const durationMs = Date.now() - joinTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        const earned = durationMinutes;

        if (earned > 0) {
          addBalance(userId, earned);
          console.log(`${userId} が ${earned} はっぱを獲得しました！`);
        }

        joinTimes.delete(userId);
      }
    }

    // AFKチャンネルに移動した場合は記録を削除
    if (newState.channelId === AFK_CHANNEL_ID) {
      joinTimes.delete(userId);
      console.log(`${userId} が AFK に移動しました`);
    }
  }
};
