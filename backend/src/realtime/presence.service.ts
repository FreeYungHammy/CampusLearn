import { redis } from "../config/redis";

const PRESENCE_TTL_SECONDS = 60;

export async function markSocketOnline(userId: string, socketId: string) {
  const routeKey = `route:user:${userId}`;
  await redis.sadd(routeKey, socketId);
  await redis.expire(routeKey, PRESENCE_TTL_SECONDS);
}

export async function markSocketOffline(userId: string, socketId: string) {
  const routeKey = `route:user:${userId}`;
  await redis.srem(routeKey, socketId);
}

export async function addMemberToRoom(callId: string, userId: string) {
  const roomKey = `room:members:${callId}`;
  await redis.sadd(roomKey, userId);
  await redis.expire(roomKey, PRESENCE_TTL_SECONDS);
}

export async function removeMemberFromRoom(callId: string, userId: string) {
  const roomKey = `room:members:${callId}`;
  await redis.srem(roomKey, userId);
}

export async function getRoomMembers(callId: string): Promise<string[]> {
  const roomKey = `room:members:${callId}`;
  return await redis.smembers(roomKey);
}



