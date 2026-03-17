import type { ClientToServerEvents, ServerToClientEvents } from '@game/shared';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL);
