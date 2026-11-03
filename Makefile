.PHONY: up down

up:
	docker compose up --build --detach
	@printf '\nFrontend: http://localhost:5173\nMailpit:  http://localhost:8025\n\n'

down:
	docker compose down
