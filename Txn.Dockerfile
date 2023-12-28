FROM node:16.20.1 as main
WORKDIR /usr/src/app
COPY ./package.json .
COPY ./tsconfig.json .
# COPY ./hypersign.json .

RUN npm install

COPY . .
RUN npm run build
CMD [ "npm","run","build", "&&",   "npm", "run","service:start"]




