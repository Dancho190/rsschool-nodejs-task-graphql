import { GraphQLObjectType, GraphQLList, GraphQLNonNull, GraphQLString } from 'graphql';
import { PrismaClient } from '@prisma/client';
import type { GraphQLResolveInfo } from 'graphql';
import type { DataLoaders } from './dataloaders.js';
import { preloadUsersWithSubs } from './dataloaders.js';
import {
  UserType,
  ProfileType,
  PostType,
  MemberTypeType,
  SubscriberType,
  CreateUserInputType,
  CreateProfileInputType,
  CreatePostInputType,
  ChangeUserInputType,
  ChangeProfileInputType,
  ChangePostInputType,
} from './schemas.js';
import { UUIDType } from './types/uuid.js';

export interface Context {
  prisma: PrismaClient;
  loaders: DataLoaders;
}

const userTypeConfig = UserType.toConfig();
userTypeConfig.fields = {
  ...userTypeConfig.fields,
  profile: {
    ...userTypeConfig.fields.profile,
    resolve: async (parent: any, _: any, ctx: Context) => {
      if (parent.profile !== undefined) return parent.profile;
      return parent.id ? ctx.prisma.profile.findUnique({ where: { userId: parent.id } }) : null;
    },
  },
  posts: {
    ...userTypeConfig.fields.posts,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.posts !== undefined ? parent.posts : ctx.loaders.postsByAuthorLoader.load(parent.id);
    },
  },
  userSubscribedTo: {
    ...userTypeConfig.fields.userSubscribedTo,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.userSubscribedTo !== undefined ? parent.userSubscribedTo : ctx.loaders.subscribersLoader.load(parent.id);
    },
  },
  subscribedToUser: {
    ...userTypeConfig.fields.subscribedToUser,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.subscribedToUser !== undefined ? parent.subscribedToUser : ctx.loaders.subscriptionsLoader.load(parent.id);
    },
  },
};

const profileTypeConfig = ProfileType.toConfig();
profileTypeConfig.fields = {
  ...profileTypeConfig.fields,
  user: {
    ...profileTypeConfig.fields.user,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.user !== undefined ? parent.user : ctx.loaders.userLoader.load(parent.userId);
    },
  },
  memberType: {
    ...profileTypeConfig.fields.memberType,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.memberType !== undefined ? parent.memberType : ctx.loaders.memberTypeLoader.load(parent.memberTypeId);
    },
  },
};

const postTypeConfig = PostType.toConfig();
postTypeConfig.fields = {
  ...postTypeConfig.fields,
  author: {
    ...postTypeConfig.fields.author,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.author !== undefined ? parent.author : ctx.loaders.userLoader.load(parent.authorId);
    },
  },
};

const subscriberTypeConfig = SubscriberType.toConfig();
subscriberTypeConfig.fields = {
  ...subscriberTypeConfig.fields,
  subscriber: {
    ...subscriberTypeConfig.fields.subscriber,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.subscriber !== undefined ? parent.subscriber : ctx.loaders.userLoader.load(parent.subscriberId);
    },
  },
  author: {
    ...subscriberTypeConfig.fields.author,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.author !== undefined ? parent.author : ctx.loaders.userLoader.load(parent.authorId);
    },
  },
};

const memberTypeTypeConfig = MemberTypeType.toConfig();
memberTypeTypeConfig.fields = {
  ...memberTypeTypeConfig.fields,
  profiles: {
    ...memberTypeTypeConfig.fields.profiles,
    resolve: async (parent: any, _: any, ctx: Context) => {
      return parent.profiles !== undefined ? parent.profiles : ctx.prisma.profile.findMany({ where: { memberTypeId: parent.id } });
    },
  },
};

export const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    users: {
      type: new GraphQLList(UserType),
      resolve: async (_: any, __: any, ctx: Context, info: GraphQLResolveInfo) => preloadUsersWithSubs(ctx.prisma, ctx.loaders, info),
    },
    user: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.loaders.userLoader.load(args.id),
    },
    posts: {
      type: new GraphQLList(PostType),
      resolve: async (_: any, __: any, ctx: Context) => ctx.prisma.post.findMany(),
    },
    post: {
      type: PostType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.loaders.postLoader.load(args.id),
    },
    profiles: {
      type: new GraphQLList(ProfileType),
      resolve: async (_: any, __: any, ctx: Context) => ctx.prisma.profile.findMany(),
    },
    profile: {
      type: ProfileType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.loaders.profileLoader.load(args.id),
    },
    memberTypes: {
      type: new GraphQLList(MemberTypeType),
      resolve: async (_: any, __: any, ctx: Context) => ctx.prisma.memberType.findMany(),
    },
    memberType: {
      type: MemberTypeType,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.loaders.memberTypeLoader.load(args.id),
    },
  },
});

export const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createUser: {
      type: UserType,
      args: { dto: { type: new GraphQLNonNull(CreateUserInputType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.prisma.user.create({ data: args.dto }),
    },
    createProfile: {
      type: ProfileType,
      args: { dto: { type: new GraphQLNonNull(CreateProfileInputType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.prisma.profile.create({ data: args.dto }),
    },
    createPost: {
      type: PostType,
      args: { dto: { type: new GraphQLNonNull(CreatePostInputType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.prisma.post.create({ data: args.dto }),
    },
    changeUser: {
      type: UserType,
      args: { id: { type: new GraphQLNonNull(UUIDType) }, dto: { type: new GraphQLNonNull(ChangeUserInputType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.prisma.user.update({ where: { id: args.id }, data: args.dto }),
    },
    changeProfile: {
      type: ProfileType,
      args: { id: { type: new GraphQLNonNull(UUIDType) }, dto: { type: new GraphQLNonNull(ChangeProfileInputType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.prisma.profile.update({ where: { id: args.id }, data: args.dto }),
    },
    changePost: {
      type: PostType,
      args: { id: { type: new GraphQLNonNull(UUIDType) }, dto: { type: new GraphQLNonNull(ChangePostInputType) } },
      resolve: async (_: any, args: any, ctx: Context) => ctx.prisma.post.update({ where: { id: args.id }, data: args.dto }),
    },
    deleteUser: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => {
        await ctx.prisma.user.delete({ where: { id: args.id } });
        return args.id;
      },
    },
    deleteProfile: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => {
        await ctx.prisma.profile.delete({ where: { id: args.id } });
        return args.id;
      },
    },
    deletePost: {
      type: GraphQLString,
      args: { id: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => {
        await ctx.prisma.post.delete({ where: { id: args.id } });
        return args.id;
      },
    },
    subscribeTo: {
      type: UserType,
      args: { userId: { type: new GraphQLNonNull(UUIDType) }, authorId: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => {
        await ctx.prisma.subscribersOnAuthors.create({ data: { subscriberId: args.userId, authorId: args.authorId } });
        return ctx.loaders.userLoader.load(args.userId);
      },
    },
    unsubscribeFrom: {
      type: GraphQLString,
      args: { userId: { type: new GraphQLNonNull(UUIDType) }, authorId: { type: new GraphQLNonNull(UUIDType) } },
      resolve: async (_: any, args: any, ctx: Context) => {
        await ctx.prisma.subscribersOnAuthors.delete({ where: { subscriberId_authorId: { subscriberId: args.userId, authorId: args.authorId } } });
        return args.authorId;
      },
    },
  },
});