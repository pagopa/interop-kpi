FROM node:20.14.0-slim@sha256:5e8ac65a0231d76a388683d07ca36a9769ab019a85d85169fe28e206f7a3208e as build 

RUN npm install -g corepack@0.31.0 && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /app/

COPY ./packages/application-audit-archiver/package.json /app/packages/application-audit-archiver/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json
COPY ./packages/kafka-connector/package.json /app/packages/kafka-connector/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json turbo.json /app/
COPY ./packages/application-audit-archiver /app/packages/application-audit-archiver
COPY ./packages/commons /app/packages/commons
COPY ./packages/kafka-connector /app/packages/kafka-connector
COPY ./packages/models /app/packages/models

RUN pnpm build && mkdir /out && cp -a --parents -t /out node_modules packages/application-audit-archiver/dist

FROM node:20.14.0-slim@sha256:5e8ac65a0231d76a388683d07ca36a9769ab019a85d85169fe28e206f7a3208e as final 

COPY --from=build /out /app
WORKDIR /app/packages/application-audit-archiver
EXPOSE 3000

CMD ["node", "."]
