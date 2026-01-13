package models

import (
	"database/sql"
	"errors"
	"ssh-terminal-app/internal/database"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	GoogleID     *string   `json:"-"`
	AuthProvider string    `json:"auth_provider"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type RegisterInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func CreateUser(input RegisterInput) (*User, error) {
	existingUser, _ := GetUserByEmail(input.Email)
	if existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	result, err := database.DB.Exec(
		`INSERT INTO users (email, password_hash, name, auth_provider) VALUES (?, ?, ?, ?)`,
		input.Email, string(hashedPassword), input.Name, "local",
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetUserByID(id)
}

func CreateGoogleUser(email, name, googleID string) (*User, error) {
	user, err := GetUserByGoogleID(googleID)
	if err == nil && user != nil {
		return user, nil
	}

	user, err = GetUserByEmail(email)
	if err == nil && user != nil {
		_, err = database.DB.Exec(
			`UPDATE users SET google_id = ?, auth_provider = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
			googleID, "google", user.ID,
		)
		if err != nil {
			return nil, err
		}
		return GetUserByID(user.ID)
	}

	result, err := database.DB.Exec(
		`INSERT INTO users (email, name, google_id, auth_provider) VALUES (?, ?, ?, ?)`,
		email, name, googleID, "google",
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetUserByID(id)
}

func GetUserByID(id int64) (*User, error) {
	user := &User{}
	err := database.DB.QueryRow(
		`SELECT id, email, password_hash, name, google_id, auth_provider, created_at, updated_at 
		FROM users WHERE id = ?`,
		id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.GoogleID, &user.AuthProvider, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func GetUserByEmail(email string) (*User, error) {
	user := &User{}
	err := database.DB.QueryRow(
		`SELECT id, email, password_hash, name, google_id, auth_provider, created_at, updated_at 
		FROM users WHERE email = ?`,
		email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.GoogleID, &user.AuthProvider, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func GetUserByGoogleID(googleID string) (*User, error) {
	user := &User{}
	err := database.DB.QueryRow(
		`SELECT id, email, password_hash, name, google_id, auth_provider, created_at, updated_at 
		FROM users WHERE google_id = ?`,
		googleID,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.GoogleID, &user.AuthProvider, &user.CreatedAt, &user.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}
