FROM node:12.6.0-buster

# setting up the working dir
WORKDIR /usr/src/app

# setting up env var from .env file
# COPY .env .
# RUN /bin/bash -c "source /usr/src/app/.env"

# pushing the code inside
COPY package*.json ./
RUN npm install
ADD . /usr/src/app
RUN rm -f .env*

# setting up the project
RUN npm run build
RUN npm run newdb

EXPOSE $PORT

CMD npm run bootstrap && npm run start
