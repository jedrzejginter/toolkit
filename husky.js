module.exports = {
  "hooks": {
    "pre-commit": `~/run-node/node_modules/.bin/eslint --config ~/run-node/.eslintrc.js --ext '.js,.jsx,.ts,.tsx' --fix .`
  }
}
