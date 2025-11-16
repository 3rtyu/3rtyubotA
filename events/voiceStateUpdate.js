// events/voiceStateUpdate.js
const { addBalance } = require('../utils/currency');
const AFK_CHANNEL_ID = '1425141446679461980'; // AFKチャンネルID
const joinTimes = new Map();

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    const member = newState.member || oldState.member;
    const userId = member?.user?.id;
    const guildId = member?.guild?.id;
    if (!userId || !guildId) return;

    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;

    // AFKに移動した場合は記録を削除
    if (newChannel === AFK_CHANNEL_ID) {
      joinTimes.delete(userId);
      console.log(`${userId} が AFK に移動しました`);
      return;
    }

    // 通話に参加（AFK以外）
    if (!oldChannel && newChannel) {
      joinTimes.set(userId, Date.now());
      console.log(`${userId} が通話に参加しました`);
      return;
    }

    // 通話から退出
    if (oldChannel && !newChannel) {
      console.log(`${userId} が通話から退出しました`);
      const joinTime = joinTimes.get(userId);
      if (joinTime) {
        const durationMs = Date.now() - joinTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        const earned = durationMinutes;

        if (earned > 0) {
          try {
            await addBalance(guildId, userId, earned);
            console.log(`${userId} が ${earned} はっぱを獲得しました！`);
          } catch (err) {
            console.error(`はっぱ加算に失敗しました (${userId}):`, err);
          }
        }

        joinTimes.delete(userId);
      } else {
        console.log(`[DEBUG] joinTimes に記録がないため、はっぱ獲得なし: ${userId}`);
      }
    }
  }
};
