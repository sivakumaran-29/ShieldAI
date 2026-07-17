export const getIceServers = (): RTCConfiguration => {
  const username = import.meta.env.VITE_METERED_USERNAME
  const credential = import.meta.env.VITE_METERED_CREDENTIAL

  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]

  if (username && credential) {
    servers.push(
      {
        urls: 'turn:global.metered.ca:80',
        username: username,
        credential: credential
      },
      {
        urls: 'turn:global.metered.ca:443',
        username: username,
        credential: credential
      },
      {
        urls: 'turn:global.metered.ca:443?transport=tcp',
        username: username,
        credential: credential
      }
    )
  }

  return { iceServers: servers }
}
