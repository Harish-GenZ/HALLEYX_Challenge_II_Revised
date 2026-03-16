const backendBaseUrl = process.env.BACKEND_PUBLIC_URL?.trim().replace(/\/+$/, '');

const rewrites = [
  ...(backendBaseUrl
    ? [
        {
          source: '/api/:path*',
          destination: `${backendBaseUrl}/api/:path*`,
        },
      ]
    : []),
  {
    source: '/orders',
    destination: '/',
  },
];

export const config = {
  installCommand: 'cd frontend && npm ci',
  buildCommand: 'cd frontend && npm run build',
  outputDirectory: 'frontend/dist',
  rewrites,
};

