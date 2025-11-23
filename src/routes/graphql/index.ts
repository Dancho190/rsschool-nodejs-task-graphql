import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { graphql, GraphQLSchema, validate } from 'graphql';
import depthLimit from 'graphql-depth-limit';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { QueryType, MutationType } from './resolvers.js';
import { createDataLoaders } from './dataloaders.js';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

  const schema = new GraphQLSchema({
    query: QueryType,
    mutation: MutationType,
  });

  fastify.route({
    url: '/',
    method: 'POST',
    schema: {
      ...createGqlResponseSchema,
      response: {
        200: gqlResponseSchema,
      },
    },
    async handler(req) {
      const { query, variables = null, operationName = null } = req.body as any;

      const loaders = createDataLoaders(prisma);

      const validationErrors = validate(schema, query, [depthLimit(5)]);

      if (validationErrors.length > 0) {
        return {
          errors: validationErrors.map((err) => ({
            message: err.message,
          })),
        };
      }

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables || undefined,
        operationName: operationName || undefined,
        contextValue: {
          prisma,
          loaders,
        },
      });

      return result;
    },
  });
};

export default plugin;