FROM node:16.20.1 as base
WORKDIR /usr/src/app
RUN git init

COPY ./package.json .
COPY ./tsconfig.json .

COPY ./entrypoint.sh .
RUN chmod +x entrypoint.sh
RUN npm install
COPY . .

FROM base as production
# RUN yarn build
WORKDIR /usr/src/app
ENTRYPOINT [ "/bin/sh", "-c", "./entrypoint.sh" ]






