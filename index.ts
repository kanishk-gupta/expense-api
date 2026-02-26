import 'dotenv/config';

import app from './src/app.ts';


(() => {
  app().catch(console.error);
})();