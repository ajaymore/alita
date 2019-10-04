import {
  mutationType,
  stringArg,
  arg,
  inputObjectType,
  idArg,
  enumType,
  booleanArg
} from 'nexus/dist';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { ANNOUNCEMENT_SENT } from '../Subscription';
import { ObjectID } from 'bson';
import crypto from 'crypto';

export const Mutation = mutationType({
  definition(t) {
    t.field('createUser', {
      type: 'User',
      args: {
        email: stringArg({ required: true }),
        name: stringArg({ required: true }),
        groups: idArg({ list: true, required: true }),
        roles: idArg({ list: true, required: true })
      },
      async resolve(_, { email, name, groups, roles }, ctx) {
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };
          const user = await ctx.db.collection('users').insertOne(
            {
              name,
              email,
              roles: roles.map(r => new ObjectID(r)),
              groups: roles.map(g => new ObjectID(g)),
              blocked: false,
              isAdmin: false,
              createdAt: new Date(),
              updatedAt: new Date()
            },
            opts
          );
          const newUser = user.ops[0];
          await Promise.all(
            roles.map(role =>
              ctx.db
                .collection('roles')
                .findOneAndUpdate(
                  { _id: new ObjectID(role) },
                  { members: { $addToSet: [newUser._id] } },
                  opts
                )
            )
          );
          await Promise.all(
            groups.map(group =>
              ctx.db
                .collection('groups')
                .findOneAndUpdate(
                  { _id: new ObjectID(group) },
                  { members: { $addToSet: [newUser._id] } },
                  opts
                )
            )
          );
          await session.commitTransaction();
          session.endSession();
          return newUser as any;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.field('updateUser', {
      type: 'User',
      args: {
        _id: idArg({ required: true }),
        email: stringArg({}),
        name: stringArg({}),
        groups: idArg({ list: true }),
        roles: idArg({ list: true }),
        blocked: booleanArg({})
      },
      async resolve(_, args, ctx) {
        const _id = new ObjectID(args._id);
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };
          let update = Object.keys(args).reduce((valid, key) => {
            if (
              (key === 'roles' || key === 'groups') &&
              args[key] &&
              Array.isArray(args[key])
            ) {
              return {
                ...valid,
                [key]: (args[key] as any).map(item => new ObjectID(item))
              };
            }
            return args[key] ? { ...valid, [key]: args[key] } : valid;
          }, {});

          const user = await ctx.db.collection('users').findOneAndUpdate(
            { _id },
            {
              ...update,
              updatedAt: new Date()
            },
            opts
          );
          if (args.roles && Array.isArray(args.roles)) {
            await ctx.db
              .collection('roles')
              .updateMany(
                { members: { $in: [_id] } },
                { $pullAll: { members: [_id] } },
                opts
              );
            await Promise.all(
              args.roles.map(role =>
                ctx.db
                  .collection('roles')
                  .findOneAndUpdate(
                    { _id: new ObjectID(role) },
                    { members: { $addToSet: [_id] } },
                    opts
                  )
              )
            );
          }
          if (args.groups && Array.isArray(args.groups)) {
            await ctx.db
              .collection('groups')
              .updateMany(
                { members: { $in: [_id] } },
                { $pullAll: { members: [_id] } },
                opts
              );
            await Promise.all(
              args.groups.map(group =>
                ctx.db
                  .collection('roles')
                  .findOneAndUpdate(
                    { _id: new ObjectID(group) },
                    { members: { $addToSet: [_id] } },
                    opts
                  )
              )
            );
          }
          await session.commitTransaction();
          session.endSession();
          return user.value;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.field('removeUser', {
      type: 'User',
      args: {
        _id: idArg({ required: true })
      },
      async resolve(_, args, ctx) {
        const _id = new ObjectID(args._id);
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };

          const user = await ctx.db.collection('users').findOneAndUpdate(
            { _id },
            {
              groups: [],
              roles: [],
              removed: true,
              blocked: true,
              isAdmin: false,
              updatedAt: new Date()
            },
            opts
          );
          await ctx.db
            .collection('roles')
            .updateMany(
              { members: { $in: [_id] } },
              { $pullAll: { members: [_id] } },
              opts
            );
          await ctx.db
            .collection('groups')
            .updateMany(
              { members: { $in: [_id] } },
              { $pullAll: { members: [_id] } },
              opts
            );
          await session.commitTransaction();
          session.endSession();
          return user.value;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.field('createGroup', {
      type: 'Group',
      args: { name: stringArg({ required: true }) },
      async resolve(_, { name }, ctx) {
        const newGroup = await ctx.db
          .collection('groups')
          .insertOne({ name, createdAt: new Date(), updatedAt: new Date() });
        return newGroup.ops[0] as any;
      }
    });
    t.boolean('removeGroup', {
      args: { _id: idArg({ required: true }) },
      async resolve(_, { _id }, ctx) {
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };
          await ctx.db
            .collection('groups')
            .deleteOne({ _id: new ObjectID(_id) }, opts);
          await ctx.db
            .collection('users')
            .updateMany(
              { groups: { $in: [new ObjectID(_id)] } },
              { $pullAll: { groups: [new ObjectID(_id)] } },
              opts
            );
          await session.commitTransaction();
          session.endSession();
          return true;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.field('modifyGroup', {
      type: 'Group',
      args: {
        _id: idArg({ required: true }),
        isRemoveOperation: booleanArg({ required: true }),
        members: idArg({ required: true, list: true })
      },
      async resolve(_, { members, _id, isRemoveOperation }, ctx) {
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };
          const operation = isRemoveOperation ? '$pullAll' : '$addToSet';
          const addRemoveMemberEntry = isRemoveOperation
            ? members.map(m => new ObjectID(m))
            : { $each: members.map(m => new ObjectID(m)) };
          const addRemoveGroupEntry = isRemoveOperation
            ? [new ObjectID(_id)]
            : new ObjectID(_id);
          const newRole = await ctx.db.collection('groups').findOneAndUpdate(
            { _id: new ObjectID(_id) },
            {
              [operation]: {
                members: addRemoveMemberEntry
              }
            },
            opts
          );
          await ctx.db
            .collection('users')
            .updateMany(
              { _id: { $in: members.map(m => new ObjectID(m)) } },
              { [operation]: { groups: addRemoveGroupEntry } },
              opts
            );
          await session.commitTransaction();
          session.endSession();
          return newRole.value;
        } catch (err) {
          console.log(err);
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.field('createRole', {
      type: 'Role',
      args: { name: stringArg({ required: true }) },
      async resolve(_, { name }, ctx) {
        const newRole = await ctx.db
          .collection('roles')
          .insertOne({ name, createdAt: new Date(), updatedAt: new Date() });
        return newRole.ops[0] as any;
      }
    });
    t.boolean('removeRole', {
      args: { _id: idArg({ required: true }) },
      async resolve(_, { _id }, ctx) {
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };
          await ctx.db
            .collection('roles')
            .remove({ _id: new ObjectID(_id) }, opts);
          await ctx.db
            .collection('users')
            .updateMany(
              { roles: { $in: [new ObjectID(_id)] } },
              { $pullAll: { roles: [new ObjectID(_id)] } },
              opts
            );
          await session.commitTransaction();
          session.endSession();
          return true;
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.field('modifyRole', {
      type: 'Role',
      args: {
        _id: idArg({ required: true }),
        isRemoveOperation: booleanArg({ required: true }),
        members: idArg({ required: true, list: true })
      },
      async resolve(_, { members, _id, isRemoveOperation }, ctx) {
        const session = ctx.client.startSession();
        session.startTransaction();
        try {
          const opts = { session, returnOriginal: false };
          const operation = isRemoveOperation ? '$pullAll' : '$addToSet';
          const addRemoveMemberEntry = isRemoveOperation
            ? members.map(m => new ObjectID(m))
            : { $each: members.map(m => new ObjectID(m)) };
          const addRemoveGroupEntry = isRemoveOperation
            ? [new ObjectID(_id)]
            : new ObjectID(_id);
          const newGroup = await ctx.db.collection('roles').findOneAndUpdate(
            { _id: new ObjectID(_id) },
            {
              [operation]: {
                members: addRemoveMemberEntry
              }
            },
            opts
          );
          await ctx.db
            .collection('users')
            .updateMany(
              { _id: { $in: members.map(m => new ObjectID(m)) } },
              { [operation]: { roles: addRemoveGroupEntry } },
              opts
            );
          await session.commitTransaction();
          session.endSession();
          return newGroup.value;
        } catch (err) {
          console.log(err);
          await session.abortTransaction();
          session.endSession();
          throw err;
        }
      }
    });
    t.string('announce', {
      args: { announcement: stringArg({ required: true }) },
      resolve(_, args, ctx) {
        ctx.pubsub.publish(ANNOUNCEMENT_SENT, args.announcement);
        return 'Sent!';
      }
    });
  }
});
