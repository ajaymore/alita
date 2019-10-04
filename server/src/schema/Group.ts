import { objectType } from 'nexus/dist';

export const Group = objectType({
  name: 'Group',
  definition(t) {
    t.implements('Node');
    t.string('name');
    t.list.field('members', {
      type: 'User',
      nullable: false,
      resolve(group: any, args, ctx) {
        return ctx.dataloader.users.loadMany(group.members);
      }
    });
  }
});
