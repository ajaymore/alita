import express from 'express';
import { MongoClient, Db } from 'mongodb';
import { Server } from 'http';
import path from 'path';
import { Request } from './context';
import { ApolloServer, PubSub } from 'apollo-server-express';
import { schema } from './schema';
import { loader as dataloader } from './dataloader';

const debug = require('debug')('alita:main');
const port = parseInt(process.env.PORT as string, 10) || 3001;
const client = new MongoClient(process.env.MONGO_CONNECTION_URL as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const app = express();
const server = new Server(app);
const pubsub = new PubSub();

client.connect(err => {
  const db = client.db('workpermit');

  // Middlewares
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use((req: Request, res: any, next: any) => {
    req.db = db;
    req.dataloader = dataloader(db);
    req.client = client;
    return next();
  });

  // GraphQL Middleware
  const apollo = new ApolloServer({
    schema,
    introspection: true,
    formatError: error => {
      // logger.error(error);
      debug(error);
      return error;
    },
    context: async ({ req, connection }: any) => {
      if (connection) {
        return connection.context;
      }
      return {
        user: req.user,
        pubsub,
        db,
        request: req,
        dataloader: dataloader(db),
        client: client
      };
    },
    subscriptions: {
      onConnect: async (connectionParams: any) => {
        if (connectionParams.Authentication) {
          try {
            return {
              pubsub,
              user: null
            };
          } catch (err) {
            debug(err);
          }
        }
        throw new Error('Missing auth token!');
      }
    },
    playground: true
  });
  apollo.applyMiddleware({ app, path: '/api/graphql' });
  apollo.installSubscriptionHandlers(server);

  // Routes

  // 404 Error Handlers
  app.use((req, res, next) => {
    const err: any = new Error('Not Found');

    err.status = 404;
    next(err);
  });

  // Final Error Handler
  app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({
      status: err.status,
      message: err.message
    });
  });

  server.listen(port, () => {
    debug(`🚂 Express Ready on http://localhost:${port}`);
    debug(
      `🚀 Apollo Server Ready on http://localhost:${port}${apollo.graphqlPath}`
    );
    debug(
      `🚀 Subscription Server Ready on ws://localhost:${port}${apollo.subscriptionsPath}`
    );
  });
});
