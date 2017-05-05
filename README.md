# Serverless Case Study

We use state machines built on top of shared logs to provide transactional state
management in an entirely serverless architecture.

## Deployment to Azure

This code may be uploaded directly to Azure Functions.
You must configure `AZURE_STORAGE_ACCOUNT` and `AZURE_STORAGE_ACCESS_KEY` in your Application settings.

Access the API endpoint via https, e.g.:
```
wget -O - 'https://MY-AZURE-APP.azurewebsites.net/api/CaseStudy?test=ping'
```
Where `MY-AZURE-APP` represents the name of your Azure Function app.

## Running unit tests

Install package dependencies:
```
npm install
```

Install Mocha and run tests:
```
npm install mocha
cd CaseStudy
../node_modules/mocha/bin/mocha
```
