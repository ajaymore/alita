import {
  makeSchema,
  interfaceType,
  asNexusMethod,
  enumType,
  objectType,
  inputObjectType
} from 'nexus';
import path from 'path';
import { GraphQLJSON } from 'graphql-type-json';
import { GraphQLDateTime } from 'graphql-iso-date';
import * as Query from './Query';
import * as Mutation from './Mutation';
import * as Subscription from './Subscription';
import * as User from './User';
import * as Role from './Role';
import * as Group from './Group';

asNexusMethod(GraphQLJSON, 'json');
asNexusMethod(GraphQLDateTime, 'date');

export const Node = interfaceType({
  name: 'Node',
  definition(t) {
    t.id('_id', {
      description: 'Unique identifier for the resource',
      nullable: false
    });
    t.field('createdAt', {
      type: 'DateTime',
      description: 'Item creation date',
      nullable: false
    });
    t.field('updatedAt', {
      type: 'DateTime',
      description: 'Item updation date',
      nullable: false
    });
    t.resolveType(() => null);
  }
});

export const Aggregate = objectType({
  name: 'Aggregate',
  definition(t) {
    t.field('count', {
      type: 'Int'
    });
  }
});

export const PageInfo = objectType({
  name: 'PageInfo',
  definition(t) {
    t.field('hasNextPage', {
      type: 'Boolean'
    });
    t.field('hasPreviousPage', {
      type: 'Boolean'
    });
    t.string('startCursor');
    t.string('endCursor');
  }
});

export const SortInput = inputObjectType({
  name: 'SortInput',
  definition(t) {
    t.string('sortBy', { required: true });
    t.string('sortDirection', { required: true });
  }
});

export const schema = makeSchema({
  types: [
    GraphQLJSON,
    GraphQLDateTime,
    Node,
    PageInfo,
    Aggregate,
    SortInput,
    User,
    Role,
    Group,
    Query,
    Mutation,
    Subscription
  ],
  outputs: {
    schema: path.join(__dirname, '../generated/schema.graphql'),
    typegen: path.join(__dirname, '../generated/schema.typegen.ts')
  },
  typegenAutoConfig: {
    sources: [
      {
        source: path.join(__dirname, '../context.ts'),
        alias: 'ctx'
      }
    ],
    contextType: 'ctx.Context'
  },
  nonNullDefaults: {
    input: false,
    output: false
  }
});
