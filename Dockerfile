FROM node:18-alpine

WORKDIR /directus

# Install Directus
RUN npm install -g directus

# Create directories
RUN mkdir -p /directus/database /directus/uploads /directus/extensions

# Copy extensions
COPY extensions /directus/extensions

# Expose port
EXPOSE 8055

# Start Directus
CMD ["npx", "directus", "start"]
