package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"ssh-terminal-app/internal/middleware"
	"ssh-terminal-app/internal/models"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

var googleOAuthConfig *oauth2.Config

func InitGoogleOAuth() {
	googleOAuthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

type GoogleUserInfo struct {
	ID            string `json:"id"`
	Email         string `json:"email"`
	VerifiedEmail bool   `json:"verified_email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

func Register(c *gin.Context) {
	var input models.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := models.CreateUser(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, err := middleware.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.SetCookie("token", token, 60*60*24*7, "/", "", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user":    user,
		"token":   token,
	})
}

func Login(c *gin.Context) {
	var input models.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := models.GetUserByEmail(input.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if user.AuthProvider == "google" && user.PasswordHash == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Please login with Google"})
		return
	}

	if !user.CheckPassword(input.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	token, err := middleware.GenerateToken(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.SetCookie("token", token, 60*60*24*7, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user":    user,
		"token":   token,
	})
}

func GoogleLogin(c *gin.Context) {
	state := "random-state-token"
	url := googleOAuthConfig.AuthCodeURL(state, oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

func GoogleCallback(c *gin.Context) {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	code := c.Query("code")
	if code == "" {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login?error=missing_code")
		return
	}

	token, err := googleOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login?error=exchange_failed")
		return
	}

	client := googleOAuthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login?error=userinfo_failed")
		return
	}
	defer resp.Body.Close()

	var googleUser GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&googleUser); err != nil {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login?error=decode_failed")
		return
	}

	user, err := models.CreateGoogleUser(googleUser.Email, googleUser.Name, googleUser.ID)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login?error=create_user_failed")
		return
	}

	jwtToken, err := middleware.GenerateToken(user)
	if err != nil {
		c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/login?error=token_failed")
		return
	}

	c.SetCookie("token", jwtToken, 60*60*24*7, "/", "", false, true)

	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/auth/callback?token="+jwtToken)
}

func GetMe(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Not authenticated"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": user})
}

func Logout(c *gin.Context) {
	c.SetCookie("token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}
