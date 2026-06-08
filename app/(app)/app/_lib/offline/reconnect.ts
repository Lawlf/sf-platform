export function shouldAnnounceReconnect(previousOnline: boolean, nextOnline: boolean): boolean {
  return previousOnline === false && nextOnline === true;
}
