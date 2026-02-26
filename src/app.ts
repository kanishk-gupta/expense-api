"use strict";

import express, { type Application, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';

import { corsOptions, PORT } from './config/index.ts';
import { unrestrictedRoutes, restrictedRoutes } from './routes/index.ts';
import { responseHandler, ErrorHandler, handleError } from './helpers/index.ts';
import { resolvers, typeDefs, type GraphQLContext, createContext } from './graphql/index.ts';
import { auth } from './middlewares/index.ts';

const main = async () => {
  const app: Application = express();

  app.use(express.json({ limit: "400mb" }));
  app.use(express.urlencoded({ limit: "400mb", extended: false }));

  app.use(cors(corsOptions));

  const server = new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
  });

  await server.start();

  // Apply the response handler middleware to all routes
  app.use(responseHandler);

  app.use('/', unrestrictedRoutes); // Unrestricted routes
  app.use('/', restrictedRoutes); // Restricted routes that need valid JWT

  app.use(
    '/graphql',
    auth.checkToken,
    expressMiddleware(server, {
      context: createContext,
    })
  );

  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Handle unknown routes
  app.all("/*splat", (req, res, next) => {
    next(new ErrorHandler(404, `Can't find ${req.originalUrl} on this server!`));
  });
  
  // Always use the end of other middlewares and routes for it to function correctly
  app.use((err: ErrorHandler, req: Request, res: Response, next: NextFunction) => {
    handleError(err, res);
  });

  app.listen(PORT, () => {
    console.log(`API server started on: ${PORT}`);
  });
};

export default main;