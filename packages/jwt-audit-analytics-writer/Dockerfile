FROM node:24.22.1-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c as build 

RUN npm install -g corepack@0.31.0 && corepack enable

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /app/

COPY ./packages/jwt-audit-analytics-writer/package.json /app/packages/jwt-audit-analytics-writer/package.json
COPY ./packages/commons/package.json /app/packages/commons/package.json
COPY ./packages/models/package.json /app/packages/models/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY tsconfig.json turbo.json /app/
COPY ./packages/jwt-audit-analytics-writer /app/packages/jwt-audit-analytics-writer
COPY ./packages/commons /app/packages/commons
COPY ./packages/models /app/packages/models

RUN pnpm build && \
  rm -rf /app/node_modules/.modules.yaml && \
  rm -rf /app/node_modules/.cache && \
  mkdir /out && \
  cp -a --parents -t /out \
  node_modules packages/jwt-audit-analytics-writer/node_modules \
  package*.json packages/jwt-audit-analytics-writer/package*.json \
  packages/commons \
  packages/models \
  packages/jwt-audit-analytics-writer/dist && \
  find /out -exec touch -h --date=@0 {} \;  

FROM node:24.22.1-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c as final 

COPY --from=build /out /app
WORKDIR /app/packages/jwt-audit-analytics-writer
EXPOSE 3000

CMD ["node", "."]
