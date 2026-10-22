@echo off
echo ============================================
echo  Mobile Shop Backend - Setup Script
echo ============================================
echo.

echo [1/4] Installing npm dependencies...
npm install
if %errorlevel% neq 0 (echo ERROR: npm install failed && pause && exit /b 1)

echo.
echo [2/4] Initializing Prisma with SQLite...
npx prisma generate
if %errorlevel% neq 0 (echo ERROR: prisma generate failed && pause && exit /b 1)

echo.
echo [3/4] Running database migration...
npx prisma migrate dev --name init
if %errorlevel% neq 0 (echo ERROR: prisma migrate failed && pause && exit /b 1)

echo.
echo [4/4] Seeding owner account...
npx prisma db seed
if %errorlevel% neq 0 (echo ERROR: seeding failed && pause && exit /b 1)

echo.
echo ============================================
echo  Setup Complete!
echo  Login: Phone=03001234567 / Pass=admin123
echo  Run: npm run dev   (starts on port 5000)
echo ============================================
pause
