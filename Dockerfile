FROM directus/directus:11

# Copiază extensiile custom
COPY extensions /directus/extensions

# Expune portul
EXPOSE 8055

# Directus va folosi variabilele de mediu din Render
CMD ["node", "cli.js", "start"]
