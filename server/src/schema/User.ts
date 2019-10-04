import { objectType } from 'nexus/dist';

export const UserEdge = objectType({
  name: 'UserEdge',
  definition(t) {
    t.string('cursor', {
      resolve(user: any, args, ctx) {
        return user._id;
      }
    });
    t.field('node', {
      type: 'User',
      resolve(user: any, args, ctx) {
        return user;
      }
    });
  }
});

export const UserConnection = objectType({
  name: 'UserConnection',
  definition(t) {
    t.list.field('edges', {
      type: 'UserEdge'
    });
    t.field('pageInfo', {
      type: 'PageInfo'
    });
    t.field('aggregate', {
      type: 'Aggregate'
    });
  }
});

export const UserPagination = objectType({
  name: 'UserPagination',
  definition(t) {
    t.field('aggregate', {
      type: 'Aggregate'
    });
    t.int('pages');
    t.int('currentPage');
    t.list.field('edges', {
      type: 'UserEdge'
    });
  }
});

export const User = objectType({
  name: 'User',
  definition(t) {
    t.implements('Node');
    t.string('email');
    t.string('name');
    t.boolean('isAdmin', {
      resolve(user: any) {
        return !!user.isAdmin;
      }
    });
    t.list.field('roles', {
      type: 'Role',
      resolve(user: any, args, ctx) {
        return ctx.dataloader.roles.loadMany(user.roles || []);
      }
    });
    t.list.field('groups', {
      type: 'Group',
      resolve(user: any, args, ctx) {
        return ctx.dataloader.roles.loadMany(user.groups || []);
      }
    });
    t.boolean('blocked');
  }
});
