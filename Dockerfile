FROM node:12-alpine AS Builder
WORKDIR /build/usr/local/bin/
RUN npm install --production @zxteam/cancellation @zxteam/errors @zxteam/logger @zxteam/sql @zxteam/sql-sqlite
COPY docker-entrypoint.js /build/usr/local/bin/docker-entrypoint.js

FROM node:12-alpine
ENV TARGET_VERSION=
COPY --from=Builder /build/ /
VOLUME [ "/data" ]
WORKDIR /data
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.js"]
CMD ["install"]
