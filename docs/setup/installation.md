# installation.md
```markdown
```bash
# Clone the repository
git clone https://github.com/your-repo/ecommerce-api.git
cd ecommerce-api

# Install dependencies
npm install

# Required environment variables (create .env file)
cat > .env <<EOL
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_NAME=ecommerce_db
JWT_SECRET=your_jwt_secret_here
COOKIE_SECRET=your_cookie_secret_here
CORS_ORIGINS=http://localhost:3000
REDIS_URL=redis://localhost:6379
EOL

# Database setup (MongoDB)
docker run -d -p 27017:27017 --name ecommerce-mongo mongo:latest

# Redis setup
docker run -d -p 6379:6379 --name ecommerce-redis redis:latest

# Start the development server
npm run dev