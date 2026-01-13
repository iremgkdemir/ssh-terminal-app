package models

import (
	"database/sql"
	"errors"
	"ssh-terminal-app/internal/crypto"
	"ssh-terminal-app/internal/database"
	"time"
)

type SSHConnection struct {
	ID                  int64     `json:"id"`
	UserID              int64     `json:"user_id"`
	Name                string    `json:"name"`
	Host                string    `json:"host"`
	Port                int       `json:"port"`
	Username            string    `json:"username"`
	AuthType            string    `json:"auth_type"`
	PasswordEncrypted   *string   `json:"-"`
	PrivateKeyEncrypted *string   `json:"-"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type SSHConnectionInput struct {
	Name       string `json:"name" binding:"required"`
	Host       string `json:"host" binding:"required"`
	Port       int    `json:"port"`
	Username   string `json:"username" binding:"required"`
	AuthType   string `json:"auth_type"`
	Password   string `json:"password"`
	PrivateKey string `json:"private_key"`
}

type SSHConnectionResponse struct {
	ID        int64     `json:"id"`
	UserID    int64     `json:"user_id"`
	Name      string    `json:"name"`
	Host      string    `json:"host"`
	Port      int       `json:"port"`
	Username  string    `json:"username"`
	AuthType  string    `json:"auth_type"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (c *SSHConnection) ToResponse() SSHConnectionResponse {
	return SSHConnectionResponse{
		ID:        c.ID,
		UserID:    c.UserID,
		Name:      c.Name,
		Host:      c.Host,
		Port:      c.Port,
		Username:  c.Username,
		AuthType:  c.AuthType,
		CreatedAt: c.CreatedAt,
		UpdatedAt: c.UpdatedAt,
	}
}

func CreateSSHConnection(userID int64, input SSHConnectionInput) (*SSHConnection, error) {
	if input.Port == 0 {
		input.Port = 22
	}

	if input.AuthType == "" {
		input.AuthType = "password"
	}

	var passwordEncrypted *string
	if input.Password != "" {
		encrypted, err := crypto.Encrypt(input.Password)
		if err != nil {
			return nil, err
		}
		passwordEncrypted = &encrypted
	}

	var privateKeyEncrypted *string
	if input.PrivateKey != "" {
		encrypted, err := crypto.Encrypt(input.PrivateKey)
		if err != nil {
			return nil, err
		}
		privateKeyEncrypted = &encrypted
	}

	result, err := database.DB.Exec(
		`INSERT INTO ssh_connections (user_id, name, host, port, username, auth_type, password_encrypted, private_key_encrypted) 
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		userID, input.Name, input.Host, input.Port, input.Username, input.AuthType, passwordEncrypted, privateKeyEncrypted,
	)
	if err != nil {
		return nil, err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetSSHConnectionByID(id, userID)
}

func GetSSHConnectionByID(id, userID int64) (*SSHConnection, error) {
	conn := &SSHConnection{}
	err := database.DB.QueryRow(
		`SELECT id, user_id, name, host, port, username, auth_type, password_encrypted, private_key_encrypted, created_at, updated_at 
		FROM ssh_connections WHERE id = ? AND user_id = ?`,
		id, userID,
	).Scan(&conn.ID, &conn.UserID, &conn.Name, &conn.Host, &conn.Port, &conn.Username, &conn.AuthType, &conn.PasswordEncrypted, &conn.PrivateKeyEncrypted, &conn.CreatedAt, &conn.UpdatedAt)

	if err == sql.ErrNoRows {
		return nil, errors.New("connection not found")
	}
	if err != nil {
		return nil, err
	}

	return conn, nil
}

func GetSSHConnectionsByUserID(userID int64) ([]SSHConnection, error) {
	rows, err := database.DB.Query(
		`SELECT id, user_id, name, host, port, username, auth_type, password_encrypted, private_key_encrypted, created_at, updated_at 
		FROM ssh_connections WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var connections []SSHConnection
	for rows.Next() {
		var conn SSHConnection
		err := rows.Scan(&conn.ID, &conn.UserID, &conn.Name, &conn.Host, &conn.Port, &conn.Username, &conn.AuthType, &conn.PasswordEncrypted, &conn.PrivateKeyEncrypted, &conn.CreatedAt, &conn.UpdatedAt)
		if err != nil {
			return nil, err
		}
		connections = append(connections, conn)
	}

	return connections, nil
}

func UpdateSSHConnection(id, userID int64, input SSHConnectionInput) (*SSHConnection, error) {
	_, err := GetSSHConnectionByID(id, userID)
	if err != nil {
		return nil, err
	}

	if input.Port == 0 {
		input.Port = 22
	}

	if input.AuthType == "" {
		input.AuthType = "password"
	}

	var passwordEncrypted *string
	if input.Password != "" {
		encrypted, err := crypto.Encrypt(input.Password)
		if err != nil {
			return nil, err
		}
		passwordEncrypted = &encrypted
	}

	var privateKeyEncrypted *string
	if input.PrivateKey != "" {
		encrypted, err := crypto.Encrypt(input.PrivateKey)
		if err != nil {
			return nil, err
		}
		privateKeyEncrypted = &encrypted
	}

	_, err = database.DB.Exec(
		`UPDATE ssh_connections SET name = ?, host = ?, port = ?, username = ?, auth_type = ?, 
		password_encrypted = COALESCE(?, password_encrypted), 
		private_key_encrypted = COALESCE(?, private_key_encrypted),
		updated_at = CURRENT_TIMESTAMP 
		WHERE id = ? AND user_id = ?`,
		input.Name, input.Host, input.Port, input.Username, input.AuthType, passwordEncrypted, privateKeyEncrypted, id, userID,
	)
	if err != nil {
		return nil, err
	}

	return GetSSHConnectionByID(id, userID)
}

func DeleteSSHConnection(id, userID int64) error {
	result, err := database.DB.Exec(
		`DELETE FROM ssh_connections WHERE id = ? AND user_id = ?`,
		id, userID,
	)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return errors.New("connection not found")
	}

	return nil
}

func (c *SSHConnection) GetDecryptedPassword() (string, error) {
	if c.PasswordEncrypted == nil {
		return "", errors.New("no password set")
	}
	return crypto.Decrypt(*c.PasswordEncrypted)
}

func (c *SSHConnection) GetDecryptedPrivateKey() (string, error) {
	if c.PrivateKeyEncrypted == nil {
		return "", errors.New("no private key set")
	}
	return crypto.Decrypt(*c.PrivateKeyEncrypted)
}
