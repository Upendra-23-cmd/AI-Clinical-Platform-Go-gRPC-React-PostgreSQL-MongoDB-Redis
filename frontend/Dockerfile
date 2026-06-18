# Use a Base Image for the application to run and create and artifact on it
FROM node AS build

# Create a work space directory in it
WORKDIR  /app

# copying the package.json and package-lock.json files to the work space directory
COPY package.json package-lock.json ./

# Install the dependencies
RUN npm install

# Copy the source code to the work space directory
COPY .    .

# Build the application
RUN npm run build

# Use a Base Image for the application to run and create and artifact on it
FROM nginx:alpine

# Copy the build artifact from the build stage to the nginx html directory
COPY --from=build /app/dist  /usr/share/nginx/html

# Expose the port on which the application will run
EXPOSE 80

# Start the nginx server
CMD ["nginx", "-g", "daemon off;"]