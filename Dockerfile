FROM node:16
WORKDIR /usr/src/app
COPY ./package.json .
COPY ./tsconfig.json .
RUN npm install
COPY . .
RUN npm run build
CMD cp /data/hypersign.json  hypersign.json  ; npm run start




