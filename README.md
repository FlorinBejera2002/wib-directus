# WIB Directus CMS

Blog & Content Management System for asigurari.ro

## Architecture

- **Directus** — Admin panel + REST/GraphQL API (port 8055)
- **PostgreSQL** — Directus internal database
- **n8n** — Workflow automation for social media posting (port 5678)
- **MongoDB** — Production content storage (read by Symfony)

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env
# Edit .env with your values

# 2. Start all services
docker-compose up -d

# 3. Wait for Directus to be ready (~60s)
# Check: http://localhost:8055

# 4. Run schema setup
node scripts/setup-schema.js

# 5. Login to Directus admin
# URL: http://localhost:8055
# Email: admin@asigurari.ro
# Password: (from .env)
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| Directus | http://localhost:8055 | CMS Admin Panel |
| n8n | http://localhost:5678 | Automation Workflows |
| PostgreSQL | localhost:5433 | Directus DB (internal) |

## Collections

- `blog_posts` — Blog articles
- `blog_categories` — 11 insurance categories
- `blog_tags` — Article tags
- `blog_comments` — User comments
- `newsletter_subscribers` — Email subscribers

## Roles

- **Administrator** — Full access
- **Editor** — CRUD on all blog content, can publish
- **Contributor** — Create drafts only, read own posts
- **Public** — Read published content, submit comments
