package main

import (
	"errors"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var jwtSecret = []byte(getJWTSecret())

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  string `json:"user"`
}

var users = map[string]string{
	"admin":  "$2a$10$rK8Q8Q8Q8Q8Q8Q8Q8Q8Q8O8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q", // password: admin123
	"trader": "$2a$10$rK8Q8Q8Q8Q8Q8Q8Q8Q8Q8O8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q", // password: trader123
}

func init() {
	hashedAdmin, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	hashedTrader, _ := bcrypt.GenerateFromPassword([]byte("trader123"), bcrypt.DefaultCost)
	users["admin"] = string(hashedAdmin)
	users["trader"] = string(hashedTrader)
}

func getJWTSecret() string {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "trading-dashboard-secret-key-change-in-production"
	}
	return secret
}

func loginHandler(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "username and password are required"})
		return
	}

	hashedPassword, exists := users[req.Username]
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "invalid credentials"})
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		Username: req.Username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to generate token"})
		return
	}

	// Set token in HTTP-only cookie
	c.SetCookie(
		"auth_token",                // name
		tokenString,                 // value
		int(24*time.Hour.Seconds()), // maxAge in seconds
		"/",                         // path
		"",                          // domain (empty = current domain)
		true,                        // secure (HTTPS only in production)
		true,                        // httpOnly
	)

	// Return only user info, not the token
	c.JSON(http.StatusOK, gin.H{
		"user": req.Username,
	})
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get token from cookie
		tokenString, err := c.Cookie("auth_token")
		if err != nil || tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "authentication required"})
			c.Abort()
			return
		}

		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, errors.New("unexpected signing method")
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("username", claims.Username)
		c.Next()
	}
}

func logoutHandler(c *gin.Context) {
	// Clear the auth_token cookie
	c.SetCookie(
		"auth_token", // name
		"",           // value
		-1,           // maxAge (negative to delete)
		"/",          // path
		"",           // domain
		true,         // secure
		true,         // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{
		"message": "logged out successfully",
	})
}
