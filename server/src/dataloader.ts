import DataLoader from 'dataloader';
import { Db, ObjectID } from 'mongodb';

interface LoaderFns {
  load: (id: any) => any;
  loadMany: (id: any[]) => any;
}

export interface AppDataLoaders {
  users: LoaderFns;
  roles: LoaderFns;
  groups: LoaderFns;
}

export function loader(mongo: Db) {
  return {
    users: new DataLoader(keys =>
      Promise.all(
        keys.map(async (_id: any) =>
          mongo.collection('users').findOne({ _id: new ObjectID(_id) })
        )
      )
    ),
    roles: new DataLoader(keys =>
      Promise.all(
        keys.map(async (_id: any) =>
          mongo.collection('roles').findOne({ _id: new ObjectID(_id) })
        )
      )
    ),
    groups: new DataLoader(keys =>
      Promise.all(
        keys.map(async (_id: any) =>
          mongo.collection('groups').findOne({ _id: new ObjectID(_id) })
        )
      )
    )
  };
}
