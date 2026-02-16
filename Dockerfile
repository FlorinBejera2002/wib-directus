FROM directus/directus:11.2.2

# Copy custom extensions
COPY ./extensions /directus/extensions

# Directus will use environment variables from Render
EXPOSE 8055
