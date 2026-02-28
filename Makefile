.PHONY: dev dev-backend dev-frontend install

# Install all dependencies
install:
	cd frontend && npm install
	cd backend && pip3 install -r requirements.txt

# Start both backend (mock mode) and frontend
dev:
	@echo "Starting AI Office in development mode..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:5173"
	@make -j2 dev-backend dev-frontend

# Start backend in mock mode
dev-backend:
	cd backend && MOCK=1 python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Start frontend dev server
dev-frontend:
	cd frontend && npm run dev

# Start backend in production mode (real agent monitoring)
prod-backend:
	cd backend && MOCK=0 python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Build frontend for production
build:
	cd frontend && npm run build
