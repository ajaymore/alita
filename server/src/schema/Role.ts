import { objectType } from 'nexus/dist';

export const Role = objectType({
  name: 'Role',
  definition(t) {
    t.implements('Node');
    t.string('name');
    t.list.field('members', {
      type: 'User',
      nullable: false,
      resolve(role: any, args, ctx) {
        return ctx.dataloader.users.loadMany(role.members);
      }
    });
  }
});
