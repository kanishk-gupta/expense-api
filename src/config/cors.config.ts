export const corsOptions = {
  // origin: ['http://localhost:3000', 'https://www.yourclientapp.com'], // Allowed origins
  origin: '*',
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
  credentials: true,
  optionsSuccessStatus: 204 // For preflight requests
};
