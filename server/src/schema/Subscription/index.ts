import { subscriptionField, idArg } from 'nexus/dist';
import { Context } from '../../context';
import { withFilter } from 'apollo-server-express';
export const ANNOUNCEMENT_SENT = 'announcementSent';

const announcementSent = subscriptionField('announcementSent', {
  type: 'String',
  // args: {
  //   id: idArg()
  // },
  subscribe: withFilter(
    (root, args, { pubsub }: Context) => {
      return pubsub.asyncIterator([ANNOUNCEMENT_SENT]);
    },
    (payload, args, ctx) => {
      // return args.id === ctx.user._id.toString();
      return true;
    }
  ),
  resolve(payload) {
    return payload;
  }
});

export const Subscription = {
  announcementSent
};
