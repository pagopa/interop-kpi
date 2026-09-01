FROM node:20.14.0-slim@sha256:5e8ac65a0231d76a388683d07ca36a9769ab019a85d85169fe28e206f7a3208e AS build

RUN npm install -g corepack@0.31.0 && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /app/

COPY ./packages/m2m-jwt-audit-analytics-writer/package.json /app/packages/m2m-jwt-audit-analytics-writer/package.json
COPY ./packages/jwt-audit-commons/package.json /app/packages/jwt-audit-commons/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json turbo.json /app/
COPY ./packages/m2m-jwt-audit-analytics-writer /app/packages/m2m-jwt-audit-analytics-writer
COPY ./packages/jwt-audit-commons /app/packages/jwt-audit-commons
COPY ./packages/commons /app/packages/commons
COPY ./packages/models /app/packages/models

RUN pnpm build && \
  rm -rf /app/node_modules/.modules.yaml && \
  rm -rf /app/node_modules/.cache && \
  mkdir /out && \
  cp -a --parents -t /out \
  node_modules packages/m2m-jwt-audit-analytics-writer/node_modules \
  package*.json packages/m2m-jwt-audit-analytics-writer/package*.json \
  packages/jwt-audit-commons \
  packages/commons \
  packages/models \
  packages/m2m-jwt-audit-analytics-writer/dist && \
  find /out -exec touch -h --date=@0 {} \;

FROM node:20.14.0-slim@sha256:5e8ac65a0231d76a388683d07ca36a9769ab019a85d85169fe28e206f7a3208e AS final

COPY --from=build /out /app
WORKDIR /app/packages/m2m-jwt-audit-analytics-writer
EXPOSE 3000

CMD ["node", "."]
