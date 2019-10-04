import { Db, MongoClient } from 'mongodb';
import { PubSub } from 'apollo-server-express';
import { Request as ExpressRequest } from 'express';
import { AppDataLoaders } from './dataloader';

export interface Context {
  request: ExpressRequest;
  user: any;
  db: Db;
  dataloader: AppDataLoaders;
  pubsub: PubSub;
  client: MongoClient;
}

export interface Request extends ExpressRequest {
  user: any;
  db: Db;
  dataloader: AppDataLoaders;
  pubsub: PubSub;
  client: MongoClient;
}
