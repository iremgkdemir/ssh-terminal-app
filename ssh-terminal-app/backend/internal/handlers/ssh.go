package handlers

import (
	"net/http"
	"ssh-terminal-app/internal/middleware"
	"ssh-terminal-app/internal/models"
	"strconv"

	"github.com/gin-gonic/gin"
)

func GetConnections(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	connections, err := models.GetSSHConnectionsByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connections"})
		return
	}

	var response []models.SSHConnectionResponse
	for _, conn := range connections {
		response = append(response, conn.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{"connections": response})
}

func GetConnection(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	connID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	connection, err := models.GetSSHConnectionByID(connID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"connection": connection.ToResponse()})
}

func CreateConnection(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)

	var input models.SSHConnectionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.AuthType == "" {
		input.AuthType = "password"
	}
	if input.AuthType != "password" && input.AuthType != "key" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid auth_type. Must be 'password' or 'key'"})
		return
	}

	if input.AuthType == "password" && input.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password is required for password authentication"})
		return
	}
	if input.AuthType == "key" && input.PrivateKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Private key is required for key authentication"})
		return
	}

	connection, err := models.CreateSSHConnection(userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create connection: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":    "Connection created successfully",
		"connection": connection.ToResponse(),
	})
}

func UpdateConnection(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	connID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	var input models.SSHConnectionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	connection, err := models.UpdateSSHConnection(connID, userID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update connection: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "Connection updated successfully",
		"connection": connection.ToResponse(),
	})
}

// DeleteConnection deletes an SSH connection
func DeleteConnection(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	connID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	if err := models.DeleteSSHConnection(connID, userID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Connection deleted successfully"})
}

func TestConnection(c *gin.Context) {
	userID := middleware.GetCurrentUserID(c)
	connID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid connection ID"})
		return
	}

	connection, err := models.GetSSHConnectionByID(connID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Connection not found"})
		return
	}

	client, err := createSSHClient(connection)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Failed to connect: " + err.Error(),
		})
		return
	}
	defer client.Close()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection successful",
	})
}
