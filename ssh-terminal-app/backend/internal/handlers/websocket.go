package handlers

import (
	"fmt"
	"log"
	"net/http"
	"ssh-terminal-app/internal/middleware"
	"ssh-terminal-app/internal/models"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/ssh"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type SSHSession struct {
	Client    *ssh.Client
	Session   *ssh.Session
	StdinPipe interface{ Write([]byte) (int, error) }
	mu        sync.Mutex
}

func createSSHClient(conn *models.SSHConnection) (*ssh.Client, error) {
	var authMethods []ssh.AuthMethod

	switch conn.AuthType {
	case "password":
		password, err := conn.GetDecryptedPassword()
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt password: %v", err)
		}
		authMethods = append(authMethods, ssh.Password(password))
	case "key":
		privateKey, err := conn.GetDecryptedPrivateKey()
		if err != nil {
			return nil, fmt.Errorf("failed to decrypt private key: %v", err)
		}
		signer, err := ssh.ParsePrivateKey([]byte(privateKey))
		if err != nil {
			return nil, fmt.Errorf("failed to parse private key: %v", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	config := &ssh.ClientConfig{
		User:            conn.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         10 * time.Second,
	}

	address := fmt.Sprintf("%s:%d", conn.Host, conn.Port)
	client, err := ssh.Dial("tcp", address, config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to %s: %v", address, err)
	}

	return client, nil
}

func HandleWebSocketTerminal(c *gin.Context) {

	connID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		userID := middleware.GetCurrentUserID(c)
		if userID == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userIDStr = strconv.FormatInt(userID, 10)
	}

	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	connection, err := models.GetSSHConnectionByID(connID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer ws.Close()

	log.Printf("WebSocket connected for connection ID: %d", connID)

	ws.WriteJSON(map[string]string{
		"type":    "status",
		"message": fmt.Sprintf("Connecting to %s@%s:%d...", connection.Username, connection.Host, connection.Port),
	})

	client, err := createSSHClient(connection)
	if err != nil {
		log.Printf("SSH connection failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("SSH connection failed: %v", err),
		})
		return
	}
	defer client.Close()

	session, err := client.NewSession()
	if err != nil {
		log.Printf("SSH session failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("Failed to create session: %v", err),
		})
		return
	}
	defer session.Close()

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,     // Enable echoing
		ssh.TTY_OP_ISPEED: 14400, // Input speed
		ssh.TTY_OP_OSPEED: 14400, // Output speed
	}

	if err := session.RequestPty("xterm-256color", 24, 80, modes); err != nil {
		log.Printf("PTY request failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("Failed to request PTY: %v", err),
		})
		return
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		log.Printf("Stdin pipe failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("Failed to get stdin: %v", err),
		})
		return
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		log.Printf("Stdout pipe failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("Failed to get stdout: %v", err),
		})
		return
	}

	stderr, err := session.StderrPipe()
	if err != nil {
		log.Printf("Stderr pipe failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("Failed to get stderr: %v", err),
		})
		return
	}

	if err := session.Shell(); err != nil {
		log.Printf("Shell start failed: %v", err)
		ws.WriteJSON(map[string]string{
			"type":    "error",
			"message": fmt.Sprintf("Failed to start shell: %v", err),
		})
		return
	}

	ws.WriteJSON(map[string]string{
		"type":    "status",
		"message": "Connected!",
	})

	done := make(chan struct{})

	go func() {
		buf := make([]byte, 1024)
		for {
			select {
			case <-done:
				return
			default:
				n, err := stdout.Read(buf)
				if err != nil {
					log.Printf("Stdout read error: %v", err)
					close(done)
					return
				}
				if n > 0 {
					ws.WriteJSON(map[string]string{
						"type": "output",
						"data": string(buf[:n]),
					})
				}
			}
		}
	}()

	go func() {
		buf := make([]byte, 1024)
		for {
			select {
			case <-done:
				return
			default:
				n, err := stderr.Read(buf)
				if err != nil {
					return
				}
				if n > 0 {
					ws.WriteJSON(map[string]string{
						"type": "output",
						"data": string(buf[:n]),
					})
				}
			}
		}
	}()

	for {
		select {
		case <-done:
			ws.WriteJSON(map[string]string{
				"type":    "status",
				"message": "Connection closed",
			})
			return
		default:
			var msg struct {
				Type string `json:"type"`
				Data string `json:"data"`
				Cols int    `json:"cols"`
				Rows int    `json:"rows"`
			}

			err := ws.ReadJSON(&msg)
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket error: %v", err)
				}
				close(done)
				return
			}

			switch msg.Type {
			case "input":
				_, err := stdin.Write([]byte(msg.Data))
				if err != nil {
					log.Printf("Stdin write error: %v", err)
					close(done)
					return
				}
			case "resize":
				if msg.Cols > 0 && msg.Rows > 0 {
					session.WindowChange(msg.Rows, msg.Cols)
				}
			}
		}
	}
}

func HandleWebSocketTerminalAuth(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Token required"})
		return
	}

	c.Request.Header.Set("Authorization", "Bearer "+token)

	HandleWebSocketTerminal(c)
}
