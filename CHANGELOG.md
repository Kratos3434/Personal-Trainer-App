# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2024-12-02

### Added
- Exercise Library Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/78).
- Light and Dark Modes (https://github.com/Kratos3434/Personal-Trainer-App/issues/79).
- Source code linter, formatter, and pre-commit hooks for both the frontend and backend (https://github.com/Kratos3434/Personal-Trainer-App/issues/84).
- Subscription (https://github.com/Kratos3434/Personal-Trainer-App/issues/87).

### Changed
- Add the missing height change option on Profile Edit Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/92).
- Enhance overall UI/UX CSS (https://github.com/Kratos3434/Personal-Trainer-App/issues/79).
- Re-import most of the exercise videos to ensure instructive types (https://github.com/Kratos3434/Personal-Trainer-App/issues/80).
- Add initial body measurement data set as the starting record of progress chart (https://github.com/Kratos3434/Personal-Trainer-App_Frontend/commit/5ef0f858c534ed4dc713913d29fa1aebcc5c2374).
- Add the missing height change option on Edit Profile page (https://github.com/Kratos3434/Personal-Trainer-App_Frontend/commit/a3249918502868a8f111fea5965defcc7289b55e).
- Edit Fitness Result page to use a similar UI sytle as the Report page for readability (https://github.com/Kratos3434/Personal-Trainer-App_Frontend/commit/3c2ce22a1c574a7beeb26f47b82805dddf197dd5).
- Updated the Body Fat Chart UI to display gender-specific information. (https://github.com/Kratos3434/Personal-Trainer-App/issues/86).
- Improve Report UI with a new feature(https://github.com/Kratos3434/Personal-Trainer-App/issues/81)
- Improve Report API to support new feature(https://github.com/Kratos3434/Personal-Trainer-App/issues/82)
  
### Removed
- Debugging comments and codes for Daily Routine, Report, Profile Entry pages and APIs(https://github.com/Kratos3434/Personal-Trainer-App/issues/83)

### Fixed
- Fix Progress Analysis Page's performance issue (https://github.com/Kratos3434/Personal-Trainer-App_Frontend/commit/cdf0b06613c6d3295405b9b144692e9c51ae585d).
- Fix ESLint warnings and errors.
- Incorrect data display, and UI on Report Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/90)
  
## [1.2.0] - 2024-11-11

### Added
- Recommendation Algorithm (https://github.com/Kratos3434/Personal-Trainer-App/issues/70).
- Generate Routine Page Modification (https://github.com/Kratos3434/Personal-Trainer-App/issues/71).
- Weekly Progress API (https://github.com/Kratos3434/Personal-Trainer-App/issues/72)

### Fixed


### Changed
- Edited the logic of routine generation, which is now done by Algorithm.js from the backend instead of generateRoutine.tsx in the backend.
- Added an indicator to enhance the visual of the Body Fat Chart.
- Edited the visual of the body fat and body mass comparison on the fitnessResult.tsx.
- Edited the sorting element of the Current Weekly Routine page from by creation date to by id to make sure it will always display the latest routine.
- Updated frontend logic for Body Measurement creation to save the weekly progress if weekly routine id is provided (https://github.com/Kratos3434/Personal-Trainer-App/issues/73). 
- Updated Fitness Results Page to display progress summary (https://github.com/Kratos3434/Personal-Trainer-App/issues/73). 

### Removed
-

## [1.1.0] - 2024-10-16

### Added
- Weekly Routine API (https://github.com/Kratos3434/Personal-Trainer-App/issues/63).
- Weekly Routine Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/62).
- Current Week's Routine API (https://github.com/Kratos3434/Personal-Trainer-App/issues/53).
- Current Week's Routine Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/52).
- Daily Routine API(https://github.com/Kratos3434/Personal-Trainer-App/issues/61)
- Daily Routine Page(https://github.com/Kratos3434/Personal-Trainer-App/issues/60)

### Changed
- Changed from live fetching from YouTube for each query to pre-fetching YouTube data to the database.
- Changed from Global State strategy from refetching from backend to using Jotai to store data in the frontend.

### Fixed
- Fixed the type error when fetching video data.

### Removed
- "Get Started" option: Profile Entry is now required to enter after a successful login for new users.

## [1.0.0] - 2024-09-23

### Added
- User_Account table, Profile Table, Body_Measurement Table, Equipment_Status Table (https://github.com/Kratos3434/Personal-Trainer-App/issues/26).
- Profile Entry Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/28).
- Profile Entry API (https://github.com/Kratos3434/Personal-Trainer-App/issues/29).
- Create UserAccount Class, Profile Class, BodyMeasurement Class (https://github.com/Kratos3434/Personal-Trainer-App/issues/30).
- Body Measurement Entry API (https://github.com/Kratos3434/Personal-Trainer-App/issues/32).
- Body Measurement Entry Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/31).
- Logout Button (https://github.com/Kratos3434/Personal-Trainer-App/issues/24).
- Home Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/22).
- Password Retrival Page, Password Change Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/47).
- Fitness Level Result (https://github.com/Kratos3434/Personal-Trainer-App/issues/25).
- Registration, Entering Otp page (https://github.com/Kratos3434/Personal-Trainer-App/issues/44).
- Fitness Level Result Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/23).
- Login Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/21).
- New User Landing Page (https://github.com/Kratos3434/Personal-Trainer-App/issues/20).
- Password Retrieval (https://github.com/Kratos3434/Personal-Trainer-App/issues/36).
- Connecting the backend to the database (https://github.com/Kratos3434/Personal-Trainer-App/issues/33).
- User Account Verificatrion (https://github.com/Kratos3434/Personal-Trainer-App/issues/43).
- Registration (https://github.com/Kratos3434/Personal-Trainer-App/issues/35).
- Logging In (https://github.com/Kratos3434/Personal-Trainer-App/issues/34).
- Setting up Front end and Back end repositories (https://github.com/Kratos3434/Personal-Trainer-App/issues/37).

### Fixed
- 

### Changed
- 

### Removed
- 
