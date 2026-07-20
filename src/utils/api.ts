export const getBackendUrl = () => {
  return import.meta.env.PROD ? 'https://to-do-list-bzna.onrender.com' : '';
};

export const getWsUrl = () => {
  if (import.meta.env.PROD) {
    return 'wss://to-do-list-bzna.onrender.com';
  }
  const wsHost = window.location.port ? `${window.location.hostname}:5000` : window.location.host;
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${wsHost}`;
};
