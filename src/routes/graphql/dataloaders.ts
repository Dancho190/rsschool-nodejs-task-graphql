import DataLoader from 'dataloader';
import { PrismaClient } from '@prisma/client';
import { parseResolveInfo, ResolveTree } from 'graphql-parse-resolve-info';
import type { GraphQLResolveInfo } from 'graphql';

export interface DataLoaders {
  userLoader: DataLoader<string, any>;
  profileLoader: DataLoader<string, any>;
  postLoader: DataLoader<string, any>;
  memberTypeLoader: DataLoader<string, any>;
  postsByAuthorLoader: DataLoader<string, any[]>;
  subscribersLoader: DataLoader<string, any[]>;
  subscriptionsLoader: DataLoader<string, any[]>;
}

export const createDataLoaders = (prisma: PrismaClient): DataLoaders => {
  const userLoader = new DataLoader(async (ids: readonly string[]) => {
    const users = await prisma.user.findMany({ where: { id: { in: ids as string[] } } });
    const map = new Map();
    users.forEach((u) => map.set(u.id, u));
    return ids.map((id) => map.get(id));
  });

  const profileLoader = new DataLoader(async (ids: readonly string[]) => {
    const profiles = await prisma.profile.findMany({ where: { id: { in: ids as string[] } } });
    const map = new Map();
    profiles.forEach((p) => map.set(p.id, p));
    return ids.map((id) => map.get(id));
  });

  const postLoader = new DataLoader(async (ids: readonly string[]) => {
    const posts = await prisma.post.findMany({ where: { id: { in: ids as string[] } } });
    const map = new Map();
    posts.forEach((p) => map.set(p.id, p));
    return ids.map((id) => map.get(id));
  });

  const memberTypeLoader = new DataLoader(async (ids: readonly string[]) => {
    const types = await prisma.memberType.findMany({ where: { id: { in: ids as string[] } } });
    const map = new Map();
    types.forEach((t) => map.set(t.id, t));
    return ids.map((id) => map.get(id));
  });

  const postsByAuthorLoader = new DataLoader(async (ids: readonly string[]) => {
    const posts = await prisma.post.findMany({ where: { authorId: { in: ids as string[] } } });
    const map = new Map();
    ids.forEach((id) => map.set(id, []));
    posts.forEach((p) => map.get(p.authorId).push(p));
    return ids.map((id) => map.get(id));
  });

  const subscribersLoader = new DataLoader(async (ids: readonly string[]) => {
    const subs = await prisma.subscribersOnAuthors.findMany({ where: { authorId: { in: ids as string[] } } });
    const map = new Map();
    ids.forEach((id) => map.set(id, []));
    subs.forEach((s) => map.get(s.authorId).push(s));
    return ids.map((id) => map.get(id));
  });

  const subscriptionsLoader = new DataLoader(async (ids: readonly string[]) => {
    const subs = await prisma.subscribersOnAuthors.findMany({ where: { subscriberId: { in: ids as string[] } } });
    const map = new Map();
    ids.forEach((id) => map.set(id, []));
    subs.forEach((s) => map.get(s.subscriberId).push(s));
    return ids.map((id) => map.get(id));
  });

  return { userLoader, profileLoader, postLoader, memberTypeLoader, postsByAuthorLoader, subscribersLoader, subscriptionsLoader };
}

export async function preloadUsersWithSubs(prisma: PrismaClient, loaders: DataLoaders, info?: GraphQLResolveInfo) {
  let needsSubs = false;
  if (info) {
    const parsed = parseResolveInfo(info) as ResolveTree;
    if (parsed?.fieldsByTypeName?.User) {
      const fields = parsed.fieldsByTypeName.User as any;
      needsSubs = !!(fields.userSubscribedTo || fields.subscribedToUser);
    }
  }


  const users = await prisma.user.findMany({
    include: needsSubs ? { userSubscribedTo: true, subscribedToUser: true } : undefined,
  });

  users.forEach((user: any) => {
    loaders.userLoader.prime(user.id, user);
    if (needsSubs && user.userSubscribedTo) loaders.subscribersLoader.prime(user.id, user.userSubscribedTo);
    if (needsSubs && user.subscribedToUser) loaders.subscriptionsLoader.prime(user.id, user.subscribedToUser);
  });

  return users;
}