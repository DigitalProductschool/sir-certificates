# Base Node.js image
FROM node:20-alpine as base

# Set for base and all layer that inherit from it
ENV NODE_ENV production

RUN apk add --no-cache \
	bash \
	build-base \
	cairo-dev \
	libpng-dev \
	g++ \
	pango-dev \
	python3 \
	;

# Install openssl
# RUN apt-get update && apt-get install -y openssl

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /app-certificates

ADD package.json ./
# RUN npm install canvas --build-from-source
RUN npm install --include=dev

# Setup production node_modules
FROM base as production-deps

WORKDIR /app-certificates

COPY --from=deps /app-certificates/node_modules /app-certificates/node_modules
ADD package.json ./
RUN npm prune --omit=dev

# Build the app
FROM base as build

WORKDIR /app-certificates

COPY --from=deps /app-certificates/node_modules /app-certificates/node_modules

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

# ENV PORT="3000"
ENV NODE_ENV="production"

WORKDIR /app-certificates

COPY --from=production-deps /app-certificates/node_modules /app-certificates/node_modules

COPY --from=build /app-certificates/build /app-certificates/build
COPY --from=build /app-certificates/public /app-certificates/public
COPY --from=build /app-certificates/prisma /app-certificates/prisma
COPY --from=build /app-certificates/package.json /app-certificates/package.json

# RUN npx prisma generate
CMD [ "npm", "run", "start" ]