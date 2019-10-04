import {
  mutationType,
  stringArg,
  arg,
  inputObjectType,
  idArg,
  queryType
} from 'nexus/dist';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { ANNOUNCEMENT_SENT } from '../Subscription';
import { ObjectID } from 'bson';
import crypto from 'crypto';

export const Mutation = queryType({
  definition(t) {
    t.string('testQuery', {
      authorize: (_, args, ctx) => {
        return false;
      },
      resolve() {
        return 'hello test mutation';
      }
    });
    t.list.field('users', {
      type: 'User',
      resolve(_, args, ctx) {
        return ctx.db
          .collection('users')
          .find({})
          .toArray();
      }
    });
    t.list.field('roles', {
      type: 'Role',
      resolve(_, args, ctx) {
        return ctx.db
          .collection('roles')
          .find({})
          .toArray();
      }
    });
    t.list.field('groups', {
      type: 'Group',
      resolve(_, args, ctx) {
        return ctx.db
          .collection('groups')
          .find({})
          .toArray();
      }
    });
  }
});
