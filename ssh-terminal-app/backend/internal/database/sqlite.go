package database

import (
	"database/sql"
	"log"
	"os"

	_ "modernc.org/sqlite"
)

var DB *sql.DB

func InitDB() error {
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./ssh_terminal.db"
	}

	var err error
	DB, err = sql.Open("sqlite", dbPath+"?_foreign_keys=on")
	if err != nil {
		return err
	}

	if err = DB.Ping(); err != nil {
		return err
	}

	log.Println("Database connected successfully")

	if err = runMigrations(); err != nil {
		return err
	}

	return nil
}

func runMigrations() error {
	migrations := []string{
		// Users table
		`CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			password_hash TEXT,
			name TEXT,
			google_id TEXT,
			auth_provider TEXT NOT NULL DEFAULT 'local',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)`,

		// SSH Connections table
		`CREATE TABLE IF NOT EXISTS ssh_connections (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			name TEXT NOT NULL,
			host TEXT NOT NULL,
			port INTEGER NOT NULL DEFAULT 22,
			username TEXT NOT NULL,
			auth_type TEXT NOT NULL DEFAULT 'password',
			password_encrypted TEXT,
			private_key_encrypted TEXT,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)`,

		// Sessions table
		`CREATE TABLE IF NOT EXISTS ssh_sessions (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			user_id INTEGER NOT NULL,
			connection_id INTEGER NOT NULL,
			started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			ended_at DATETIME,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			FOREIGN KEY (connection_id) REFERENCES ssh_connections(id) ON DELETE CASCADE
		)`,

		`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
		`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)`,
		`CREATE INDEX IF NOT EXISTS idx_ssh_connections_user_id ON ssh_connections(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_ssh_sessions_user_id ON ssh_sessions(user_id)`,
	}

	for _, migration := range migrations {
		_, err := DB.Exec(migration)
		if err != nil {
			log.Printf("Migration error: %v\nQuery: %s", err, migration)
			return err
		}
	}

	log.Println("Database migrations completed")
	return nil
}

func CloseDB() {
	if DB != nil {
		DB.Close()
	}
}
