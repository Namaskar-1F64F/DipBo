import Logger from './logger';
import { getSubscription, getSubscriptions, addSubscription, removeSubscription } from './database';
import { checkWebsite } from '../webdiplomacy/diplomacy';

let intervals = {}; // Store intervals which can be later stopped by the /stop command

export const add = async (cid, gid) => {
  try {
    if (await getSubscription(cid) == null) {
      await addSubscription(cid, gid);
      return start(cid, gid);
    }
    return false;
  }
  catch (err) {
    Logger.error(`Tried to add game with ID ${gid} for chat ${cid}, but got an error: ${err}`);
  }
  return false;
};

export const start = async (cid, gid) => {
  checkWebsite(cid, gid);
  intervals[cid] = setInterval(function () {
    checkWebsite(cid, gid);
  }, (process.env.REFRESH_INTERVAL_MINUTES || 6) * 60 * 1000);
  return true;
}

export const stop = async (cid) => {
  clearInterval(intervals[cid]);
  return await removeSubscription(cid);
};

export const init = async () => {
  const subscriptions = await getSubscriptions();
  if (subscriptions) {
    const slice = ((process.env.REFRESH_INTERVAL_MINUTES || 6) * 60 * 1000) / subscriptions.length;
    subscriptions.forEach((subscription, idx) => {
      const { cid, gid } = subscription;
      const interval = slice * idx;
      Logger.info(`Auto starting game ${gid} for chat ${cid} at time t+${interval}`);
      setTimeout(start, interval, cid, gid);
    });
  }
}
