const { addBalance } = require('../utils/currency');
const AFK_CHANNEL_ID = '1425141446679461980'; // AFKチャンネルID
const SPECIAL_CHANNEL_ID = '1441932852307562496'; // 2倍チャンネルID
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

    // ✅ AFKに移動した場合も、通話時間を加算してから記録を削除
    if (newChannel === AFK_CHANNEL_ID) {
      console.log(`${userId} が AFK に移動しました`);
      const joinTime = joinTimes.get(userId);
      if (joinTime) {
        const durationMs = Date.now() - joinTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        const multiplier = oldChannel === SPECIAL_CHANNEL_ID ? 2 : 1;
        const earned = durationMinutes * multiplier;

        if (earned > 0) {
          await addBalance(guildId, userId, earned);
          console.log(`${userId} が AFK移動前に ${earned} はっぱを獲得しました！`);
        }
        joinTimes.delete(userId);
      }
      return;
    }

    // ✅ チャンネル移動（AFK以外）
    if (oldChannel && newChannel && oldChannel !== newChannel) {
      const joinTime = joinTimes.get(userId);
      if (joinTime) {
        const durationMs = Date.now() - joinTime;
        const durationMinutes = Math.floor(durationMs / 60000);
        const multiplier = oldChannel === SPECIAL_CHANNEL_ID ? 2 : 1;
        const earned = durationMinutes * multiplier;

        if (earned > 0) {
          await addBalance(guildId, userId, earned);
          console.log(`${userId} が ${oldChannel} から ${newChannel} に移動し、${earned} はっぱを獲得しました！`);
        }
      }
      // 新しいチャンネルに入った時刻を記録
      joinTimes.set(userId, Date.now());
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
        const multiplier = oldChannel === SPECIAL_CHANNEL_ID ? 2 : 1;
        const earned = durationMinutes * multiplier;

        if (earned > 0) {
          await addBalance(guildId, userId, earned);
          console.log(`${userId} が通話から退出し、${earned} はっぱを獲得しました！`);
        }

        joinTimes.delete(userId);
      } else {
        console.log(`[DEBUG] joinTimes に記録がないため、はっぱ獲得なし: ${userId}`);
      }
    }
  }
};
