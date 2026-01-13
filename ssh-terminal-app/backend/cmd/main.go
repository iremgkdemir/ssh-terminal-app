package main

import (
	"log"
	"os"
	"ssh-terminal-app/internal/crypto"
	"ssh-terminal-app/internal/database"
	"ssh-terminal-app/internal/handlers"
	"ssh-terminal-app/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	if err := database.InitDB(); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDB()

	if err := crypto.InitEncryption(); err != nil {
		log.Fatalf("Failed to initialize encryption: %v", err)
	}

	middleware.InitJWT()

	handlers.InitGoogleOAuth()

	ginMode := os.Getenv("GIN_MODE")
	if ginMode == "" {
		ginMode = "debug"
	}
	gin.SetMode(ginMode)

	r := gin.Default()
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL, "http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", handlers.Register)
			auth.POST("/login", handlers.Login)
			auth.GET("/google", handlers.GoogleLogin)
			auth.GET("/google/callback", handlers.GoogleCallback)
			auth.POST("/logout", handlers.Logout)
			auth.GET("/me", middleware.AuthMiddleware(), handlers.GetMe)
		}

		ssh := api.Group("/ssh")
		ssh.Use(middleware.AuthMiddleware())
		{
			ssh.GET("/connections", handlers.GetConnections)
			ssh.GET("/connections/:id", handlers.GetConnection)
			ssh.POST("/connections", handlers.CreateConnection)
			ssh.PUT("/connections/:id", handlers.UpdateConnection)
			ssh.DELETE("/connections/:id", handlers.DeleteConnection)
			ssh.POST("/connections/:id/test", handlers.TestConnection)
		}
	}

	r.GET("/ws/ssh/:id", handlers.HandleWebSocketTerminal)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("rontend URL: %s", frontendURL)
	log.Printf("Google OAuth configured: %v", os.Getenv("GOOGLE_CLIENT_ID") != "")

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
