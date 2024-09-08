# Welcome to the Personal Trainer App Backend
This is the personal trainer app backend. It is deployed to AWS Lambda and API Gateway through AWS Amplify.

# Getting Started
- In your local terminal, you can clone the backend through https typing **git pull https://github.com/Kratos3434/Personal-Trainer-App.git** in the CMD.
- Inside the amplify folder, you can see our backend **express.js** inside the **/amplify/backend/function/serverRESTv1/src**.
- Change your directory to the src folder then do **npm i** to install any dependencies.
- In the terminal, type **npx prisma generate** to generate the prisma ORM for database operations.

# Rules
There are two branches, **main** and **development**.
- **Main** branch will automatically deploy to **production**, so test your code before pushing to avoid crashing the **production server**.
- **Development** branch is mainly used for testing our code. Test your code here before pushing to the **main** branch.

# Pushing and Pulling
Once you are ready to push/publish your code do these steps to avoid any merge conflicts in production:
- enter the command **git status** to check any changes that you made. If you don't want a file to be committed, type: **git restore <filename>**.
- next, do **git add .** to add all of the changes that you made for staging.
- next, do **git commit -m "Commit Message (What changes did u do)"** to commit your changes and make it ready to be published.
- next, pull the latest code from the development branch, do **git pull origin development:development**.
- next, if there are merge conflicts, resolve it locally.
- lastly, if there are no more conflicts, do **git push origin development:development** to only push to the development branch.
