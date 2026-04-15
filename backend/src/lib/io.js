/**
 * Shared Socket.IO instance holder.
 * Breaks the circular dependency between index.js and route files.
 */

let _io = null;

export function setIO(io) {
  _io = io;
}

export function getIO() {
  if (!_io) throw new Error('Socket.IO not initialized yet');
  return _io;
}
