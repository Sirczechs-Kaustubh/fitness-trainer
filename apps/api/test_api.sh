#!/bin/bash

# ==============================================================================
# AI Fitness Trainer - Comprehensive API Test Script
#
# Description:
# This script tests all core endpoints of the API using standard command-line
# tools. It simulates a full user workflow, from registration to tracking
# workouts and viewing analytics. It also tests admin-specific functionality.
#
# Test Flow:
# 1.  Registers two users: one regular user and one to act as an admin.
# 2.  Tests the full authentication lifecycle (login, logout, password reset).
# 3.  (As Admin) Manages the exercise library (Create, Update, Delete).
# 4.  (As User) Interacts with the API:
#     - Fetches and updates their profile.
#     - Views the exercise library.
#     - Starts and ends a workout session.
#     - Fetches workout history and progress analytics.
#     - Deletes a workout from their history.
# 5.  Tests the public tutorial endpoint.
#
# Requirements:
# - `curl`: A command-line tool for transferring data with URLs.
# - `sed`: A stream editor for filtering and transforming text.
# - The backend API server must be running and the database must be empty
#   or seeded with an admin user for the exercise management tests to pass.
# ==============================================================================

# --- Configuration ---
BASE_URL="http://localhost:4000/api/v1"
UNIQUE_ID=$(date +%s)

# --- Regular User Credentials ---
USER_NAME="Test User ${UNIQUE_ID}"
USER_EMAIL="user_${UNIQUE_ID}@example.com"
USER_INITIAL_PASSWORD="password123"
USER_NEW_PASSWORD="newpassword456"

# --- Admin User Credentials (STATIC) ---
# We use a static email for the admin so we only have to set their role once in the DB.
ADMIN_NAME="Static Admin User"
ADMIN_EMAIL="admin@example.com" # <-- STATIC EMAIL
ADMIN_PASSWORD="adminpassword123"

# --- Global Variables for storing dynamic data ---
USER_TOKEN=""
ADMIN_TOKEN=""
EXERCISE_ID=""
WORKOUT_ID=""
EXERCISE_NAME="Test Squat ${UNIQUE_ID}" # <-- UNIQUE EXERCISE NAME

# --- Helper Functions ---
print_header() {
    echo ""
    echo "=================================================="
    echo "=> $1"
    echo "=================================================="
}

# Extracts a value from a JSON string using sed.
# Usage: extract_json_value <json_string> <key>
extract_json_value() {
    # A more robust function to extract string, numeric, or boolean values.
    # It captures the value part (anything between a colon and a comma/brace)
    # and then removes leading/trailing quotes and whitespace.
    local raw_value
    raw_value=$(echo "$1" | sed -n 's/.*"'"$2"'"\s*:\s*\([^,}]*\).*/\1/p')
    # Trim whitespace and remove quotes
    echo "$raw_value" | xargs | sed 's/"//g'
}

# Extracts an ID which might be nested
extract_id() {
    echo "$1" | sed -n 's/.*"_id":"\([^"]*\)".*/\1/p'
}


# ==============================================================================
# --- STAGE 1: AUTHENTICATION & USER SETUP ---
# ==============================================================================

print_header "1.1 Testing Admin User Login/Registration"
# Try to log in first. If it fails, register the admin.
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'"${ADMIN_EMAIL}"'",
        "password": "'"${ADMIN_PASSWORD}"'"
    }')
ADMIN_TOKEN=$(extract_json_value "${ADMIN_LOGIN_RESPONSE}" "token")

if [ -z "$ADMIN_TOKEN" ]; then
    echo "Admin not found, attempting registration..."
    ADMIN_REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "'"${ADMIN_NAME}"'",
            "email": "'"${ADMIN_EMAIL}"'",
            "password": "'"${ADMIN_PASSWORD}"'"
        }')
    ADMIN_TOKEN=$(extract_json_value "${ADMIN_REGISTER_RESPONSE}" "token")
    if [ -z "$ADMIN_TOKEN" ]; then
        echo "❌ Admin Registration Failed! Ensure the user doesn't already exist from a failed run."
        echo "Response: ${ADMIN_REGISTER_RESPONSE}"
        exit 1
    else
        echo "✅ Admin Registration Successful. PLEASE SET 'role: \"admin\"' in the database for ${ADMIN_EMAIL} and re-run."
        exit 1 # Exit so the user can set the role
    fi
else
    echo "✅ Admin Login Successful."
fi


print_header "1.2 Testing Regular User Registration (POST /auth/register)"
USER_REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "'"${USER_NAME}"'",
        "email": "'"${USER_EMAIL}"'",
        "password": "'"${USER_INITIAL_PASSWORD}"'"
    }')
USER_TOKEN=$(extract_json_value "${USER_REGISTER_RESPONSE}" "token")
if [ -z "$USER_TOKEN" ]; then
    echo "❌ User Registration Failed!"
    echo "Response: ${USER_REGISTER_RESPONSE}"
    exit 1
else
    echo "✅ User Registration Successful."
    echo "User Email: ${USER_EMAIL}"
fi

print_header "1.3 Testing User Login (POST /auth/login)"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'"${USER_EMAIL}"'",
        "password": "'"${USER_INITIAL_PASSWORD}"'"
    }')
USER_TOKEN=$(extract_json_value "${LOGIN_RESPONSE}" "token")
if [ -z "$USER_TOKEN" ]; then
    echo "❌ Login Failed!"
    echo "Response: ${LOGIN_RESPONSE}"
    exit 1
else
    echo "✅ Login Successful."
fi

print_header "1.4 Testing User Logout (POST /auth/logout)"
LOGOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/logout" \
    -H "Authorization: Bearer ${USER_TOKEN}")
LOGOUT_MESSAGE=$(extract_json_value "${LOGOUT_RESPONSE}" "message")
if [[ "$LOGOUT_MESSAGE" == "Logged out successfully" ]]; then
    echo "✅ Logout Successful."
else
    echo "❌ Logout Failed!"
    echo "Response: ${LOGOUT_RESPONSE}"
    exit 1
fi

print_header "1.5 Testing Forgot Password (POST /auth/forgot-password)"
FORGOT_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/forgot-password" \
    -H "Content-Type: application/json" \
    -d '{"email": "'"${USER_EMAIL}"'"}')
RESET_TOKEN=$(extract_json_value "${FORGOT_RESPONSE}" "resetToken")
if [ -z "$RESET_TOKEN" ]; then
    echo "❌ Forgot Password Failed!"
    echo "Response: ${FORGOT_RESPONSE}"
    exit 1
else
    echo "✅ Forgot Password Token Generated."
fi

print_header "1.6 Testing Reset Password (PUT /auth/reset-password/:token)"
RESET_RESPONSE=$(curl -s -X PUT "${BASE_URL}/auth/reset-password/${RESET_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"password": "'"${USER_NEW_PASSWORD}"'"}')
USER_TOKEN=$(extract_json_value "${RESET_RESPONSE}" "token")
if [ -z "$USER_TOKEN" ]; then
    echo "❌ Password Reset Failed!"
    echo "Response: ${RESET_RESPONSE}"
    exit 1
else
    echo "✅ Password Reset Successful."
fi

print_header "1.7 Verifying Login with New Password"
FINAL_LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "email": "'"${USER_EMAIL}"'",
        "password": "'"${USER_NEW_PASSWORD}"'"
    }')
USER_TOKEN=$(extract_json_value "${FINAL_LOGIN_RESPONSE}" "token")
if [ -z "$USER_TOKEN" ]; then
    echo "❌ Login with new password Failed!"
    echo "Response: ${FINAL_LOGIN_RESPONSE}"
    exit 1
else
    echo "✅ Login with new password Successful."
fi

# ==============================================================================
# --- STAGE 2: EXERCISE LIBRARY MANAGEMENT (ADMIN) ---
# ==============================================================================

print_header "2.1 Testing Create Exercise (POST /exercises) - As Admin"
CREATE_EXERCISE_RESPONSE=$(curl -s -X POST "${BASE_URL}/exercises" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -d '{
        "name": "'"${EXERCISE_NAME}"'",
        "description": "A fundamental bodyweight exercise.",
        "difficulty": "Beginner",
        "musclesTargeted": ["Quadriceps", "Glutes"],
        "videoUrl": "http://example.com/squat.mp4"
    }')
EXERCISE_ID=$(extract_id "${CREATE_EXERCISE_RESPONSE}")
if [ -z "$EXERCISE_ID" ]; then
    echo "❌ Create Exercise Failed!"
    echo "Response: ${CREATE_EXERCISE_RESPONSE}"
    exit 1
else
    echo "✅ Exercise Created Successfully. ID: ${EXERCISE_ID}"
fi

print_header "2.2 Testing Update Exercise (PUT /exercises/:id) - As Admin"
UPDATE_EXERCISE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/exercises/${EXERCISE_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -d '{"difficulty": "Intermediate"}')
UPDATED_DIFFICULTY=$(extract_json_value "${UPDATE_EXERCISE_RESPONSE}" "difficulty")
if [[ "$UPDATED_DIFFICULTY" == "Intermediate" ]]; then
    echo "✅ Exercise Updated Successfully."
else
    echo "❌ Update Exercise Failed!"
    echo "Response: ${UPDATE_EXERCISE_RESPONSE}"
    exit 1
fi

# ==============================================================================
# --- STAGE 3: USER WORKFLOW ---
# ==============================================================================

print_header "3.1 Testing Get User Profile (GET /users/me)"
PROFILE_RESPONSE=$(curl -s -X GET "${BASE_URL}/users/me" \
    -H "Authorization: Bearer ${USER_TOKEN}")
PROFILE_EMAIL=$(extract_json_value "${PROFILE_RESPONSE}" "email")
if [[ "$PROFILE_EMAIL" == "$USER_EMAIL" ]]; then
    echo "✅ Get User Profile Successful."
else
    echo "❌ Get User Profile Failed!"
    echo "Response: ${PROFILE_RESPONSE}"
    exit 1
fi

print_header "3.2 Testing Update User Profile (PUT /users/me)"
UPDATE_PROFILE_RESPONSE=$(curl -s -X PUT "${BASE_URL}/users/me" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -d '{"age": 30, "weight": 75, "height": 180}')
UPDATED_AGE=$(extract_json_value "${UPDATE_PROFILE_RESPONSE}" "age")
if [[ "$UPDATED_AGE" == "30" ]]; then
    echo "✅ Update User Profile Successful."
else
    echo "❌ Update User Profile Failed!"
    echo "Response: ${UPDATE_PROFILE_RESPONSE}"
    exit 1
fi

print_header "3.3 Testing Get All Exercises (GET /exercises) - As User"
GET_EXERCISES_RESPONSE=$(curl -s -X GET "${BASE_URL}/exercises" \
    -H "Authorization: Bearer ${USER_TOKEN}")
EXERCISE_COUNT=$(extract_json_value "${GET_EXERCISES_RESPONSE}" "total")
if [ "$EXERCISE_COUNT" -gt 0 ]; then
    echo "✅ Get All Exercises Successful. Found ${EXERCISE_COUNT} exercises."
else
    echo "❌ Get All Exercises Failed!"
    echo "Response: ${GET_EXERCISES_RESPONSE}"
    exit 1
fi

print_header "3.4 Testing Start Workout (POST /workouts/start)"
START_WORKOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/workouts/start" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -d '{"plannedExercises": ["'"${EXERCISE_NAME}"'"]}')
WORKOUT_ID=$(extract_json_value "${START_WORKOUT_RESPONSE}" "workoutId")
if [ -z "$WORKOUT_ID" ]; then
    echo "❌ Start Workout Failed!"
    echo "Response: ${START_WORKOUT_RESPONSE}"
    exit 1
else
    echo "✅ Workout Started Successfully. ID: ${WORKOUT_ID}"
fi

# Wait for a moment to simulate workout duration
sleep 1

print_header "3.5 Testing End Workout (POST /workouts/:id/end)"
END_WORKOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/workouts/${WORKOUT_ID}/end" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${USER_TOKEN}" \
    -d '{
        "exercises": [{
            "exercise": "'"${EXERCISE_ID}"'",
            "name": "'"${EXERCISE_NAME}"'",
            "reps": 10,
            "sets": 3,
            "formScore": 95
        }]
    }')
WORKOUT_STATUS=$(extract_json_value "${END_WORKOUT_RESPONSE}" "status")
if [[ "$WORKOUT_STATUS" == "completed" ]]; then
    echo "✅ Workout Ended Successfully."
else
    echo "❌ End Workout Failed!"
    echo "Response: ${END_WORKOUT_RESPONSE}"
    exit 1
fi

print_header "3.6 Testing Get User Stats (GET /users/stats)"
STATS_RESPONSE=$(curl -s -X GET "${BASE_URL}/users/stats" \
    -H "Authorization: Bearer ${USER_TOKEN}")
TOTAL_WORKOUTS=$(extract_json_value "${STATS_RESPONSE}" "totalWorkouts")
if [[ "$TOTAL_WORKOUTS" == "1" ]]; then
    echo "✅ Get User Stats Successful."
else
    echo "❌ Get User Stats Failed!"
    echo "Response: ${STATS_RESPONSE}"
    exit 1
fi

print_header "3.7 Testing Get Progress Analytics (GET /progress)"
PROGRESS_RESPONSE=$(curl -s -X GET "${BASE_URL}/progress?period=weekly" \
    -H "Authorization: Bearer ${USER_TOKEN}")
ANALYTICS_WORKOUTS=$(extract_json_value "${PROGRESS_RESPONSE}" "totalWorkouts")
if [[ "$ANALYTICS_WORKOUTS" == "1" ]]; then
    echo "✅ Get Progress Analytics Successful."
else
    echo "❌ Get Progress Analytics Failed!"
    echo "Response: ${PROGRESS_RESPONSE}"
    exit 1
fi

print_header "3.8 Testing Get Workout History (GET /history)"
HISTORY_RESPONSE=$(curl -s -X GET "${BASE_URL}/history" \
    -H "Authorization: Bearer ${USER_TOKEN}")
HISTORY_COUNT=$(extract_json_value "${HISTORY_RESPONSE}" "totalDocs")
if [[ "$HISTORY_COUNT" == "1" ]]; then
    echo "✅ Get Workout History Successful."
else
    echo "❌ Get Workout History Failed!"
    echo "Response: ${HISTORY_RESPONSE}"
    exit 1
fi

# ==============================================================================
# --- STAGE 4: DATA CLEANUP & PUBLIC ENDPOINTS ---
# ==============================================================================

print_header "4.1 Testing Delete Workout from History (DELETE /history/:id)"
DELETE_HISTORY_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/history/${WORKOUT_ID}" \
    -H "Authorization: Bearer ${USER_TOKEN}")
DELETE_MESSAGE=$(extract_json_value "${DELETE_HISTORY_RESPONSE}" "message")
if [[ "$DELETE_MESSAGE" == "Workout successfully deleted from your history." ]]; then
    echo "✅ Delete Workout from History Successful."
else
    echo "❌ Delete Workout from History Failed!"
    echo "Response: ${DELETE_HISTORY_RESPONSE}"
    exit 1
fi

print_header "4.2 Testing Delete Exercise (DELETE /exercises/:id) - As Admin"
DELETE_EXERCISE_RESPONSE=$(curl -s -X DELETE "${BASE_URL}/exercises/${EXERCISE_ID}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
DELETE_EX_MESSAGE=$(extract_json_value "${DELETE_EXERCISE_RESPONSE}" "message")
if [[ "$DELETE_EX_MESSAGE" == "Exercise deleted successfully" ]]; then
    echo "✅ Delete Exercise Successful."
else
    echo "❌ Delete Exercise Failed!"
    echo "Response: ${DELETE_EXERCISE_RESPONSE}"
    exit 1
fi

print_header "4.3 Testing Get Tutorials (GET /tutorials) - Public"
# This test assumes you have seeded at least one tutorial in the database.
TUTORIAL_RESPONSE=$(curl -s -X GET "${BASE_URL}/tutorials")
TUTORIAL_MESSAGE=$(extract_json_value "${TUTORIAL_RESPONSE}" "message")
if [[ "$TUTORIAL_MESSAGE" == "Tutorials retrieved successfully." ]]; then
    echo "✅ Get Tutorials Successful."
elif [[ "$TUTORIAL_MESSAGE" == "No tutorials found." ]]; then
    echo "⚠️  Get Tutorials Warning: Endpoint is working but no tutorials are seeded in the DB."
else
    echo "❌ Get Tutorials Failed!"
    echo "Response: ${TUTORIAL_RESPONSE}"
    exit 1
fi


print_header "All API tests passed successfully! 🎉"
echo ""




