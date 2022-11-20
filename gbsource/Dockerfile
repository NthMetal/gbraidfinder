# Base image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

ENV NODE_ENV=prod

# Creates a "dist" folder with the production build
RUN npm run build

# Start the server using the production build
EXPOSE 3000
CMD [ "node", "dist/main.js" ]
